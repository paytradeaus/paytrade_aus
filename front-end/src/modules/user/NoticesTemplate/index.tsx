"use client";
import React, { useEffect, useRef, useState } from "react";
import FormikControl from "@/components/FormikControl";
import { buttonType, InputType } from "@/shared/constant/general";
import * as Yup from "yup";
import { useFormik } from "formik";
import CustomEditor from "@/components/ysEditor";
import {
  FetchDetailsOfANoticeMail,
  SentMailForANotice,
  UpdateNoticeMail,
} from "./noticesTemplate.functions";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import CustomButton from "@/components/CustomButton/CustomButton";
import BreadCrumbs from "@/components/BreadCrumbs";
import AsyncCreatableSelect from "react-select/async-creatable";
import { useLoaderContext } from "@/context/useLoader";

const NoticeTemplate = () => {
  const [emailError, setEmailError] = useState("");
  const isAdmin = useSearchParams().get("admin-mode");

  const validationSchema = Yup.object().shape({
    from: Yup.string(),
    toEmails: Yup.string().required("At least one recipient is required"),
    subject: Yup.string().required("Subject message is required"),
  });

  const [editorContent, setEditorContent] = useState("");

  const [ccEmailSelectedOpt, setCcEmailSelectedOpt] = useState<any>([]);

  const printPreviewRef = useRef<HTMLDivElement>(null); // Specify the type of ref
  const { setLoader, setLoaderInfo }: any = useLoaderContext();
  //

  const formik: any = useFormik({
    initialValues: {
      ccEmails: "",
      subject: "",
    },
    validationSchema,
    onSubmit: (values) => {
      {
      }
    },
  });

  const params = useParams();

  const [emailViewData, setEmailViewData] = useState<any>({});
  const [options, setOptions] = useState<any>([]);

  useEffect(() => {
    fetchNoticesTemplate();
  }, []);

  function truncateName(fileName: any) {
    return fileName?.length > 40
      ? fileName.slice(0, 40).concat("...")
      : fileName;
  }

  async function fetchNoticesTemplate() {
    if (params?.id) {
      const payload: any = {
        id: params?.id || "",
      };
      const emailDataResponse = await FetchDetailsOfANoticeMail(payload);
      if (emailDataResponse?.id) {
        setEmailViewData(emailDataResponse);
        setAttachmentFiles([
          ...emailDataResponse?.supportDoc,
          emailDataResponse?.uploadedNotice,
        ]);
        setEditorContent(emailDataResponse?.email_content);
      }
      // else {
      //   setWrongIdCheck(true);
      // }
    }
  }

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

  // Function to format the label for creating new options
  const formatCreateLabel = (inputValue: any) => `"${inputValue}"`;

  //

  const router = useRouter();
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);

  const handleEditorChange = (content: any) => {
    setEditorContent(content);
  };

  function handleViewFile(displayFile: any) {
    if (
      displayFile &&
      typeof displayFile?.attachmentImage === "string" &&
      displayFile.attachmentImage?.includes("base64")
    ) {
      fetch(displayFile?.attachmentImage)
        .then((res) => res.blob())
        .then((res) => {
          window.open(URL.createObjectURL(res), "_blank");
        });
    } else if (displayFile?.file_path) {
      window.open(displayFile?.file_path, "_blank");
    } else {
      try {
        window.open(URL.createObjectURL(displayFile), "_blank");
      } catch (err: any) {
        console.log(err);
      }
    }
  }

  const handleSelectCCEmailsChange = (newOption: any) => {
    formik.setFieldValue(
      "ccEmails",
      newOption.map((option: any) => option.value).join(",")
    );
    setCcEmailSelectedOpt(newOption);
  };

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

  const getFileIcon = (file: any) => {
    const fileExtension = file.file_name?.split(".").pop()?.toLowerCase() ?? "";
    switch (fileExtension) {
      case "pdf":
        return "/images/pdf-icon.png";
      case "docx":
        return "/images/docx-icon.png";
      case "jpg":
      case "jpeg":
      case "png":
        return "/images/imagesfileTypes.webp";
      default:
        return "/images/imagesfileTypes.webp"; // Default icon
    }
  };

  async function onSaveSendClick() {
    try {
      if (!emailViewData?.notice_id) {
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
      setLoader(true);
      setLoaderInfo("Saving changes...");
      const responseData = await UpdateNoticeMail(payloadData);
      if (responseData?.id) {
        setLoaderInfo("Sending mail...");
        let sendmailData = await SentMailForANotice({ id: responseData?.id });
        if (sendmailData) {
          router.push(AppRoutes.USER_NOTICES);
        }
      }
      setLoader(false);
      setLoaderInfo("");
    } catch (err: any) {
      setLoaderInfo("");
      setLoader(false);
    }
  }

  return (
    <div className="pt_fullpage">
      <div className="pt_crumbclose">
        <div className="hideOnPrint">
          <BreadCrumbs
            routePaths={[
              {
                name: "Dashboard",
                path: AppRoutes.ADMIN_DASHBOARD,
              },
              {
                name: "Notice",
                path: "",
              },
            ]}
            activeRoute={"Send notice"}
            routeBack
          />
        </div>
        <div className="pt_topfilters ">
          <div className="pt_pageactions visibilityHiddenOnPrint">
            <CustomButton
              actionType="button"
              buttonName="Close"
              buttonType={`${buttonType.CONTRAST} ${buttonType.SMALL_BUTTON}`}
              onClick={() => router.back()}
              iconClassName={"fa-light fa-xmark-large"}
            />
          </div>
        </div>
      </div>
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
              <form>
                <FormikControl
                  label={"From"}
                  name={"from"}
                  id={"from"}
                  control={InputType.TEXT_FIELD}
                  disabled
                  value={emailViewData?.email_from}
                  maxLength={26}
                />

                <FormikControl
                  label={"To"}
                  name={"To"}
                  id={"To"}
                  control={InputType.TEXT_FIELD}
                  disabled
                  value={emailViewData?.email_to}
                  maxLength={26}
                />
                <label htmlFor={"cc"}>
                  <small>
                    {"CC (Separate all emails by a comma with no spaces)"}
                  </small>
                </label>
                <AsyncCreatableSelect
                  isMulti
                  cacheOptions
                  defaultOptions={options}
                  onChange={handleSelectCCEmailsChange}
                  value={ccEmailSelectedOpt}
                  placeholder={" "}
                  openMenuOnClick={false}
                  onCreateOption={handleCreate}
                  formatCreateLabel={formatCreateLabel}
                  styles={{
                    control: (provided: any) => ({
                      ...provided,
                      height: "100%",
                      width: "100%",
                    }),
                    valueContainer: (provided: any) => ({
                      ...provided,
                      height: "100%",
                      overflowY: "auto",
                    }),
                  }}
                />
                {emailError ? (
                  <small className="invalid">
                    <i className="fa-light fa-circle-xmark"></i>
                    {/* Icon for the error message */}
                    {emailError}
                  </small>
                ) : null}
                <br />
                <FormikControl
                  label={"Subject"}
                  name={"subject"}
                  id={"subject"}
                  disabled
                  control={InputType.TEXT_FIELD}
                  onBlur={formik.handleBlur("subject")}
                  value={emailViewData.email_subject}
                  maxLength={26}
                />
                <br />

                <label className="labelStyle">
                  <small>Email Body</small>
                </label>

                <CustomEditor
                  onChange={(data: any) => {
                    handleEditorChange(data);
                  }}
                  // suppresshydrationwarning={true}
                  value={editorContent}
                />
                <br />
                <label>
                  <small>Attachments</small>
                </label>
                {/* <i className={"fa-light fa-paperclip"}></i> */}
                {/* <small>&nbsp;&thinsp;Maximum Size: 20MB</small> */}

                {attachmentFiles?.map((eachFile: any, index: number) => {
                  return (
                    <div
                      className="pt_itemwithremove"
                      style={{ margin: "5px 0px" }}
                      key={index}
                    >
                      <span> {truncateName(eachFile?.file_name)}</span>
                      <div>
                        <CustomButton
                          buttonName={"View"}
                          buttonType={`${buttonType.SECONDARY} ${buttonType.SMALL_BUTTON}`}
                          iconClassName={"fa-light fa-eye"}
                          actionType="button"
                          onClick={() => handleViewFile(eachFile)}
                        />
                      </div>
                    </div>
                  );
                })}
              </form>
            </div>
            <div className="previewBoxStyle">
              <div>
                <b>From:</b> <span>{emailViewData?.email_from}</span>
              </div>
              <br />
              <div>
                <b>To:</b> <span>{emailViewData?.email_to}</span>
              </div>
              <br />
              <div>
                <b>CC:</b> <span>{formik?.values?.ccEmails}</span>
              </div>
              {attachmentFiles?.map((eachFile: any, index: number) => {
                return (
                  <div
                    className="pt_itemwithremove"
                    style={{ margin: "5px 0px" }}
                    key={index}
                  >
                    <div>
                      <img
                        src={getFileIcon(eachFile)}
                        alt="file icon"
                        style={{
                          width: "20px",
                          height: "20px",
                          marginRight: "10px",
                        }}
                      />
                      <span>{truncateName(eachFile?.file_name)}</span>
                    </div>
                  </div>
                );
              })}

              <p className="thirdHeaderText">{emailViewData.email_subject}</p>
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
        <div className="pt_fullpageactions">
          <div className="hideOnPrint">
            <a href="#">
              <button className="contrast" onClick={() => router.back()}>
                <i className="fa-light fa-xmark-large"></i>
                {"Cancel"}
              </button>
            </a>
          </div>
          <div className="hideOnPrint">
            <CustomButton
              buttonName="Print"
              iconClassName="fa-sharp-duotone fa-light fa-print"
              buttonType={buttonType.SECONDARY}
              actionType="button"
              onClick={handlePrintClick}
            />
            &nbsp;
            <CustomButton
              buttonName="Send and Close"
              iconClassName="fa-light fa-circle-check"
              buttonType={buttonType.PRIMARY}
              actionType="button"
              onClick={() => onSaveSendClick()}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoticeTemplate;
