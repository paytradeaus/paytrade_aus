"use client";
import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import { useLoaderContext } from "@/context/useLoader";
import * as Yup from "yup";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  FetchDetailsOfANotice,
  fetchFiltersForAdminNotices,
  UploadReceivedNotice,
} from "./notices.functions";
import { getCookie } from "cookies-next";
import BaseModal from "@/components/BaseModal";
import AttachmentUpload from "@/components/attachmentUpload";
import CustomButton from "@/components/CustomButton/CustomButton";
import { buttonType } from "@/shared/constant/general";
import { singleUploadApi } from "@/app/api/commonApi";
import { getDecryptedToken } from "@/utils";
import { AppRoutes } from "@/shared/constant/appRoutes";

const AddReceivedNotice = ({ viewMode }: any) => {
  const { setLoader }: any = useLoaderContext();
  const router = useRouter();
  const [accountList, setAccountList] = useState<any>();
  const [selectedNoticesType, setSelectedNoticesType] = useState<any>("");
  const [selectedProjectName, setSelectedProjectName] = useState<any>("");

  const [selectedAccountName, setSelectedAccountName] = useState<any>("");
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [projectOpt, setProjectOpt] = useState<any>([]);
  const [selectedNoticeTypeObj, setSelectedNoticeTypeObj] = useState<any>("");
  const [noticesTypeOptions, setNoticesTypeOptions] = useState<any>([]);
  const [selectedAccountTypeObj, setSelectedAccountTypeObj] = useState<any>("");
  const [selectedProjectObj, setSelectedProjectObj] = useState<any>("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [fileError, setFileError] = useState(false);
  const [noticeData, setNoticeData] = useState<any>(null);
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const params = useParams();
  const searchParams = useSearchParams();
  const screen = searchParams.get("screen");
  const importId = searchParams.get("importid");

  const AllowedTypes = [
    "application/pdf",
    // "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const handleOpenModal = () => {
    setShowUploadModal(true);
    setFileError(false);
    // setSelectedFile(null);
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  // 2️⃣ Fetch Projects & Notice Types based on selectedAccountName
  useEffect(() => {
    const fetchAccountRelatedFilters = async () => {
      if (!selectedAccountName) return; // Only fetch if an account is selected

      const result = await fetchFiltersForAdminNotices({
        company_id: selectedCompanyId || null,
        bank_account_id: Number(selectedAccountName) || null,
        account_type: "",
        notice_type: null,
        project_id: null,
        status: "",
      });

      setProjectOpt(
        (result?.project_list ?? []).map(({ name, value }: any) => ({
          label: name,
          value: value,
        }))
      );

      setNoticesTypeOptions(
        (result?.notice_type_list ?? []).map(({ name, value }: any) => ({
          label: name,
          value: value,
        }))
      );
    };

    fetchAccountRelatedFilters();
  }, [selectedAccountName]);

  useEffect(() => {
    if (viewMode) {
      fetchNotices();
    }
  }, []);

  useEffect(() => {
    if (screen === "import" && importId) {
      fetchNoticeFromImport(importId);
    }
  }, [screen, importId]);

  async function fetchNoticeFromImport(importId: string) {
    try {
      setLoader(true);
      const payload = { id: importId }; // Assuming your API expects `import_id`
      const resourceData: any = await FetchDetailsOfANotice(payload);

      if (resourceData) {
        // Set form values like in viewMode
        formik.setValues({
          account_name: "",
          project_name: "",
          notice_type: resourceData?.notice_type || "",
          Notice: resourceData?.uploadedNotice || null,
        });

        // setSelectedAccountTypeObj({
        //   label: resourceData?.bank_account_name,
        //   value: resourceData?.bank_account_id,
        // });

        // setSelectedProjectObj({
        //   label: resourceData?.project_name,
        //   value: resourceData?.project_id,
        // });

        setSelectedNoticeTypeObj({
          label: resourceData?.notice_type,
          value: resourceData?.notice_type,
        });

        setSelectedFile(resourceData?.uploadedNotice);
      }
    } catch (error) {
      console.error("Error fetching import notice:", error);
    } finally {
      setLoader(false);
    }
  }

  useEffect(() => {
    if (viewMode && noticeData) {
      formik.setValues({
        account_name: noticeData?.bank_account_id || "",
        project_name: noticeData?.project_id || "",
        notice_type: noticeData?.notice_type || "",
        Notice: noticeData?.uploadedNotice || null,
      });

      setSelectedAccountTypeObj({
        label: noticeData?.bank_account_name,
        value: noticeData?.bank_account_id,
      });

      setSelectedProjectObj({
        label: noticeData?.project_name,
        value: noticeData?.project_id,
      });

      setSelectedNoticeTypeObj({
        label: noticeData?.notice_type,
        value: noticeData?.notice_type,
      });

      setSelectedFile(noticeData?.uploadedNotice);
    }
  }, [noticeData, viewMode]);

  async function fetchNotices() {
    try {
      if (params?.id) {
        const payload: any = {
          id: Array.isArray(params?.id) ? params.id[0] : params?.id || "",
        };
        setLoader(true);
        const resourceData: any = await FetchDetailsOfANotice(payload);
        if (resourceData?.notice_id) {
          setNoticeData(resourceData);
        } else {
          setWrongIdCheck(true);
        }
        setLoader(false);
      }
    } catch {
      setLoader(false);
    }
  }

  const validationSchema = Yup.object().shape({
    account_name: Yup.string().required("Account name is required"),
    project_name: Yup.string().required("Project name is required"),
    notice_type: Yup.string().required("Notice type is required"),
    // Notice: Yup.string().required("Notice attachment is required"),
    Notice: Yup.mixed()
      .required("Notice attachment is required")
      .test("file-required", "Notice attachment is required", (value) => {
        return !!value; // ensure not null
      }),
  });

  const formik = useFormik({
    initialValues: {
      account_name: "",
      project_name: "",
      notice_type: "",
      Notice: null,
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoader(true); // Start loader

      const decodedToken: any = getDecryptedToken();
      const token = localStorage.getItem("accessToken") ?? "";

      try {
        // 1. Prepare payload and submit GraphQL mutation first
        const payload = {
          bank_account_id: values?.account_name,
          project_id: +values?.project_name,
          notice_type: values?.notice_type,
          is_recieved_notice: true,
          company_id: selectedCompanyId || null,
        };

        const response = await UploadReceivedNotice(payload, true, setLoader);

        if (!response?.notice_id) {
          //   showErrorToast("Notice creation failed: Missing notice ID.");
          return;
        }

        // 2. Use notice_id in userData for file upload
        const userData = {
          user_id: decodedToken?.userId,
          uploaded_by: decodedToken?.emailId,
          attachment_type: "Recieved_notices_uploads",
          notice_id: response.notice_id, // ✅ attach notice_id to the file
        };

        const fileResponse: any = await singleUploadApi(
          values?.Notice,
          userData,
          token
        );

        router.push(`${AppRoutes?.USER_NOTICES}?routedFrom=received`);
        // Optional: redirect or reset form here
      } catch (error) {
        console.error("❌ Error during notice submission:", error);
        // showErrorToast("Something went wrong while submitting notice.");
      } finally {
        setLoader(false); // End loader
      }
    },
  });

  const fetchFilters = async () => {
    const result = await fetchFiltersForAdminNotices({
      company_id: selectedCompanyId || null,
      bank_account_id: Number(selectedAccountName) || null,
      account_type: "",
      notice_type: selectedNoticesType || null,

      project_id: selectedProjectName ? Number(selectedProjectName) : null,
      status: "",
    });
    let account_list = result?.account_list ?? [];
    let project_list = result?.project_list ?? [];
    let notice_type_list = result?.notice_type_list ?? [];
    if (result) {
      setAccountList([
        ...account_list.map(({ name, value }: any) => {
          return {
            label: name,
            value: Number(value),
          };
        }),
      ]);

      setNoticesTypeOptions([
        ...notice_type_list.map(({ name, value }: any) => ({
          label: name,
          value: value,
        })),
      ]);
      setProjectOpt([
        ...project_list.map(({ name, value }: any) => ({
          label: name,
          value: value,
        })),
      ]);
    }
  };

  const handleSelectChange = (
    selectedValue: any,
    field?:
      | "project_name"
      | "account_name"
      | "notice_type"
      | "notice_source"
      | "status"
  ) => {
    if (field === "notice_type") {
      setSelectedNoticesType(selectedValue?.value);
      formik.setFieldValue(field, selectedValue?.value);
      setSelectedNoticeTypeObj(selectedValue);
    }
    if (field === "project_name") {
      setSelectedProjectName(selectedValue?.value);
      formik.setFieldValue(field, selectedValue?.value);
      setSelectedProjectObj(selectedValue);
    }
    if (field === "account_name") {
      setSelectedAccountName(selectedValue?.value);
      formik.setFieldValue(field, selectedValue?.value);
      setSelectedProjectObj(""); // Reset selected project when account changes
      setSelectedNoticeTypeObj("");
    }
    // Perform any other actions based on the selected value
  };

  const handleSave = () => {
    if (!selectedFile) {
      setFileError(true);
      return;
    }

    setFileError(false);
    // Your submission logic here
    // ✅ Update Formik's value and remove error
    formik.setFieldValue("Notice", selectedFile);
    formik.setFieldTouched("Notice", true, false);
    // Close modal after successful save
    setShowUploadModal(false);
    return true;
  };

  const handleViewFile = () => {
    if (
      selectedFile &&
      typeof selectedFile === "string" &&
      selectedFile.includes("base64")
    ) {
      fetch(selectedFile)
        .then((res) => res.blob())
        .then((blob) => {
          window.open(URL.createObjectURL(blob), "_blank");
        });
    } else if (selectedFile?.file) {
      // Local file or blob
      window.open(URL.createObjectURL(selectedFile.file), "_blank");
    } else if (selectedFile?.file_path) {
      // Already hosted file
      window.open(selectedFile.file_path, "_blank");
    }
  };

  const handleImageSelect = (file: File) => {
    setFileError(false);
    setSelectedFile(file);
  };

  return (
    <div className="pt_smallbgimage">
      <div className="pt_centered">
        <div className="pt_centeredinner">
          <div className="pt_box_transparent_cp">
            <div className="grid">
              <div className="pt_login">
                <h4>
                  {screen === "import"
                    ? "Import received notice"
                    : viewMode
                    ? "View received notice"
                    : "Add received notice"}
                </h4>

                <br />
                <form onSubmit={formik.handleSubmit}>
                  <SearchableSelect
                    label="Account name"
                    placeholder="Select an account name"
                    name="Account Name"
                    required
                    options={accountList}
                    onChange={(name: any) => {
                      handleSelectChange(name, "account_name");
                      setSelectedAccountTypeObj(name);
                    }}
                    selectedData={selectedAccountTypeObj}
                    renderKey="label"
                    valueKey="value"
                    isRequired={
                      !formik?.values?.account_name &&
                      formik.touched.account_name
                        ? true
                        : false
                    }
                    errorMessage={formik?.errors?.account_name as string}
                    // disabled={viewMode || screen === "import"}
                    disabled={viewMode}
                  />
                  <br />

                  <SearchableSelect
                    label="Project name"
                    placeholder={"Select a project name"}
                    name="Project Name"
                    required
                    options={projectOpt}
                    onChange={(project: any) => {
                      handleSelectChange(project, "project_name");
                      setSelectedProjectObj(project);
                    }}
                    selectedData={selectedProjectObj}
                    renderKey="label"
                    valueKey="value"
                    isRequired={
                      !formik?.values?.project_name &&
                      formik.touched.project_name
                        ? true
                        : false
                    }
                    errorMessage={formik?.errors?.project_name as string}
                    // disabled={viewMode || screen === "import"}
                    disabled={!selectedAccountName || viewMode}
                  />
                  <br />
                  <SearchableSelect
                    label="Notice type"
                    required
                    placeholder={"Select a notice type"}
                    name="Notices Type"
                    options={noticesTypeOptions}
                    onChange={(v: any) => {
                      console.log("🚀 ~ v:", v);
                      handleSelectChange(v, "notice_type");
                      setSelectedNoticeTypeObj(v);
                    }}
                    selectedData={selectedNoticeTypeObj}
                    renderKey="label"
                    valueKey="value"
                    isRequired={
                      !formik?.values?.notice_type && formik.touched.notice_type
                        ? true
                        : false
                    }
                    errorMessage={formik?.errors?.notice_type as string}
                    disabled={
                      !selectedAccountName || viewMode || screen === "import"
                    }
                  />
                  <br />
                  {!viewMode && screen !== "import" && (
                    <>
                      <label>
                        <small>Notice details</small>
                        <span className="required">*</span>
                      </label>

                      <CustomButton
                        buttonName={
                          formik.values.Notice
                            ? "Attachment added"
                            : "Add notice attachment"
                        }
                        buttonType={buttonType.OUTLINE_CONTRAST}
                        error={formik.errors.Notice}
                        showError={
                          !!(formik.touched.Notice && formik.errors.Notice)
                        }
                        actionType="button"
                        onClick={handleOpenModal}
                        inputButton
                      />
                    </>
                  )}
                  {(screen === "import" || viewMode) &&
                    selectedFile?.file_path && (
                      <>
                        <label>
                          <small>Notice Document</small>
                          <span className="required">*</span>
                        </label>
                        <div className="pt_itemwithremove">
                          <span>{selectedFile?.file_name}</span>
                          <div>
                            <CustomButton
                              buttonName={"View"}
                              buttonType={`${buttonType.SECONDARY} ${buttonType.SMALL_BUTTON}`}
                              iconClassName={"fa-light fa-eye"}
                              actionType="button"
                              onClick={() =>
                                window.open(selectedFile?.file_path, "_blank")
                              }
                            />
                          </div>
                        </div>
                      </>
                    )}

                  <br />
                  <br />

                  <div className="grid">
                    <input
                      type="button"
                      value="Cancel"
                      className="outline contrast"
                      onClick={() => {
                        router.push(
                          `${AppRoutes?.USER_NOTICES}?routedFrom=received`
                        );
                      }}
                    />
                    {!viewMode && (
                      <input
                        type="submit"
                        value={"Save"} // Dynamic button text
                        className="secondary"
                        // onClick={() => formik?.handleSubmit()}
                      />
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="paytradeffectwrap">
        <div className="paytradeffect">
          <div className="themeshade"></div>
          <div className="oceanshade"></div>
          <div className="crabshade"></div>
        </div>
      </div>
      <div className="noise"></div>
      {/* Modal */}
      {showUploadModal && (
        <BaseModal
          modalId="AttachmentUploadModal"
          title="Upload Received Notice"
          displayModal={showUploadModal}
          onClose={() => {
            if (formik?.values?.Notice && !selectedFile) {
              formik.setFieldValue("Notice", null);
              formik.setFieldTouched("Notice", true, false);
            }
            setShowUploadModal(false);
            return true;
          }}
          onConfirm={handleSave}
          secondButtonName="Save"
        >
          <AttachmentUpload
            onFileSelect={handleImageSelect}
            placeholder="Select or drag and drop"
            selected_file={selectedFile}
            selected_filename={selectedFile?.name || ""}
            disabled={false}
            allowedTypes={AllowedTypes}
            onFileRemove={() => setSelectedFile(null)}
            showViewRemoveBtn={true}
            IsRequired={fileError}
            onView={handleViewFile}
          />
        </BaseModal>
      )}
    </div>
  );
};

export default AddReceivedNotice;
