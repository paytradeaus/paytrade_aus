"use client";
import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { usePathname, useRouter } from "next/navigation";

import { useParams } from "next/navigation";

import FileSelector from "@/components/fileSelector/fileSelector";
import Image from "next/image";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
  showWarningToast,
} from "@/components/Toaster";

import { singleUploadApi } from "@/network/apolloClient";
import { useDebouncedFieldCheck, useTokenDetails } from "@/hooks";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  buttonType,
  fileTypeFormats,
  imageTypeFormats,
  InputType,
  uploadFile,
} from "@/shared/constant/general";
import FormikControl from "@/components/FormikControl";
import CustomButton from "@/components/CustomButton/CustomButton";
import BaseModal from "@/components/BaseModal";
import BreadCrumbs from "@/components/BreadCrumbs";
import CustomEditor from "@/components/Editor/Editor";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import TabSwitch from "@/components/TabSwitch";
import {
  AdminFetchAllMasterTypeDetails,
  AdminUpdateBlogResource,
} from "../../AdminBlog/BlogList/blogList.function";
import {
  AdminAddBlogResource,
  adminDeleteBlogResAttachment,
  AdminGetBlogResourceById,
  CheckBlogResourceNameExistence,
} from "../../AdminBlog/addBlog/addEditBlog.function";
import AttachmentUpload from "@/components/AttachmentUpload";
import MultipleFileHandler from "@/components/MultipleFileHandler";
import { addEditStatusOptions } from "../../AdminBlog/BlogList/blogList.constant";
import { useLoaderContext } from "@/context/useLoader";

const AddEditResource = (props: any) => {
  const routePath = usePathname();
  const router = useRouter();
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [editData, setEditData] = useState<any>({});
  const [wrongStatusCheck, setWrongStatusCheck] = useState("");

  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const params = useParams();
  const isEdit = params?.id ? true : false;
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [editorContent, setEditorContent] = useState("");
  const [selectedStatusData, setSelectedStatusData] = useState<any>("Draft");
  const [selectCategoryData, setSelectCategoryData] = useState<any>({
    value: "91fb1e89-dc1d-44e2-a98b-dfce0c0c5167",
    label: "Uncategorized",
  });
  const [files, setFiles] = useState<File[]>([]);
  console.log("🚀 ~ AddEditResource ~ files:", files);
  const [imagePathUrl, setImagePathUrl] = useState("");
  console.log("🚀 ~ AddEditResource ~ imagePathUrl:", imagePathUrl);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState("Blog Definition");
  const [contentError, setContentError] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [attachmentUrl, setAttachmentUrl] = useState<any>([]);
  const { setLoader, setLoaderInfo }: any = useLoaderContext();

  useEffect(() => {
    (async () => {
      const categoryData = await AdminFetchAllMasterTypeDetails(
        "Resource Category"
      );
      if (categoryData?.length > 0) {
        setCategoryOptions(categoryData);
      }
      if (isEdit && params?.id) {
        const payload: any = {
          blogId: params?.id || "",
        };
        const resourceData = await AdminGetBlogResourceById(payload);
        if (resourceData?.id) {
          setWrongStatusCheck(resourceData?.blog_status);
          setEditData(resourceData);
        } else {
          setWrongIdCheck(true);
        }
      }
    })();
  }, []);

  useEffect(() => {
    // Set initial values for formik once editData is available
    if (isEdit && editData?.id) {
      formik.setValues({
        Title: editData?.title || "",
        Status: editData?.blog_status || "Draft",
        category: editData?.category?.id || "",
        tags: editData?.tags?.toString() || "",
        enableComments: isEdit ? editData?.enable_comments ?? true : true,
        isTitleExistence: false,
      });
      // let selStatusOpt =
      //   addEditStatusOptions.find(
      //     (each) => each.value === editData?.blog_status
      //   ) || {};
      // setSelectedStatusData(selStatusOpt);

      let selCategoryOpt =
        categoryOptions.find(
          (each: any) => each?.value === editData?.category?.id
        ) || {};
      setSelectCategoryData(selCategoryOpt);
      setEditorContent(editData?.content);
      setImagePathUrl(editData?.banner?.file_path || "");
      setAttachmentUrl(
        editData?.attachment?.file_path
          ? [
              {
                ...editData?.attachment,
                file: editData?.attachment?.file_path,
                name: editData?.attachment?.file_name,
              },
            ]
          : []
      );
      setTimeKey(new Date().getTime());
    }
  }, [isEdit, editData]);

  const validationSchema = Yup.object().shape({
    Title: Yup.string()
      .required("Please enter the blog title")
      .max(100, "Title must be at most 100 characters")
      .test(function (value, formData: any) {
        if (isEdit && value === editData?.title) return true;
        if (!value.trim()) return true; // Handle empty email

        const blogNameChecks = formData.parent.isTitleExistence;
        if (blogNameChecks) {
          return this.createError({
            path: this.path,
            message: "Blog or resource name already exists.",
          });
        }
        return true;
      }),
    tags: Yup.string().max(200, "Tags must be at most 200 characters"),
    Status: Yup.string().required("Please select a status"),
    category: Yup.string().required("Category is required"),
    enableComments: Yup.boolean(),
  });
  const customStyles = {
    control: (provided: any) => ({
      height: "40px",
      width: "100%",
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      height: "40px",
      overflowY: "auto",
    }),
  };
  const formik = useFormik({
    initialValues: {
      Title: isEdit ? editData?.title : "",
      category: isEdit
        ? editData?.category?.id
        : "69dabbc7-6c43-43df-a7c2-6820eda53919",
      Status: isEdit ? editData?.blog_status : "Draft",
      tags: "",
      enableComments: isEdit ? editData?.enable_comments ?? true : true,
      isTitleExistence: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      const { category, tags, Title, Status, enableComments } = values;
      if (
        editorContent.length === 0 &&
        attachmentFiles.length === 0 &&
        attachmentUrl.length === 0
      ) {
        showWarningToast(
          "Either Resource content or attachment file cannot be empty"
        );
        return;
      }
      let payload = {
        categoryId: category || "",
        content: editorContent,
        content_type: "Resource",
        tags: tags.split(", ") || [],
        title: Title,
        blog_status: Status,
        enable_comments: true,
      };
      setIsLoading(true);
      setLoader(true);
      if (isEdit) {
        setLoaderInfo("Updating resource guide...");
        if (
          Title === editData?.title &&
          Status === editData?.blog_status &&
          category === editData?.category?.id &&
          tags === editData?.tags.toString() &&
          files.length === 0 &&
          attachmentFiles.length === 0 &&
          editorContent === editData?.content
        ) {
          showInfoToast("No changes to save");
          setIsLoading(false);
          setLoader(false);
          setLoaderInfo("");
          return;
        }
        let modifiedPayload = {
          ...payload,
          id: editData?.id,
        };
        if (attachmentFiles.length > 0) {
          let userData = {
            blog_res_id: editData?.id,
            uploaded_by: decodeTokenData?.emailId || "",
            attachment_type: "Resource_attachments",
          };
          const fileResponse = await singleUploadApi(
            attachmentFiles[0],
            userData,
            accessTokenId
          );
        }
        if (files.length > 0) {
          let userData = {
            blog_res_id: editData?.id,
            uploaded_by: decodeTokenData?.emailId || "",
            attachment_type: "Blog_banner",
          };
          const fileResponse = await singleUploadApi(
            files[0],
            userData,
            accessTokenId
          );
        }
        let response = await AdminUpdateBlogResource(
          modifiedPayload,
          "Resource guide has been updated",
          setIsLoading
        );
        if (response) {
          router.push(AppRoutes.RESOURCE_GUIDES_LIST);
        }
        setLoader(false);
        setLoaderInfo("");
      } else {
        setLoaderInfo("Saving new resource guide...");
        let response = await AdminAddBlogResource(payload);
        if (response?.id) {
          if (attachmentFiles.length > 0) {
            let userData = {
              blog_res_id: response.id,
              uploaded_by: decodeTokenData?.emailId || "",
              attachment_type: "Resource_attachments",
            };
            const fileResponse = await singleUploadApi(
              attachmentFiles[0],
              userData,
              accessTokenId
            );
          }
          if (files.length > 0) {
            let userData = {
              blog_res_id: response.id,
              uploaded_by: decodeTokenData?.emailId || "",
              attachment_type: "Blog_banner",
            };
            const fileResponse = await singleUploadApi(
              files[0],
              userData,
              accessTokenId
            );
          }
          showSuccessToast("Your resource guide has been saved");
          router.push(AppRoutes.RESOURCE_GUIDES_LIST);
        }
        setIsLoading(false);
        setLoader(false);
        setLoaderInfo("");
      }
    },
  });

  const checkNameExistence = async (name: string) => {
    // Call your API or validation logic for checking email
    const response = await CheckBlogResourceNameExistence(name); // Example API call
    return response;
  };

  const isNameChecking = useDebouncedFieldCheck(
    formik.values.Title,
    checkNameExistence,
    () => {
      formik.setFieldError("Title", "Blog or resource name already exists.");
      formik.setFieldValue("isTitleExistence", true);
    }, // Error: set error
    (error: any) => {
      formik.setFieldError("Title", "");
      formik.setFieldValue("isTitleExistence", false);
    } // Success: clear error
  );

  const handleRemoveConfirmed = async () => {
    setFiles([]);
    setOpenModal(false);
    const payload = {
      attachmentType: "Blog_banner",
      blogResId: editData?.id,
    };
    let response = await adminDeleteBlogResAttachment(payload);
    if (response) {
      setImagePathUrl("");
    }
  };

  const handleRemoveAttachmentConfirmed = async (modifiedFiles: any) => {
    if (modifiedFiles?.id) {
      const payload = {
        attachmentType: "Resource_attachments",
        blogResId: editData?.id,
      };
      let response = await adminDeleteBlogResAttachment(payload);
      if (response) {
        setAttachmentUrl([]);
      }
    } else {
      setAttachmentUrl([]);
    }
  };

  const handleEditorChange = (content: any) => {
    setEditorContent(content);
    setContentError("");
  };

  const handleFileChange = (newFiles: File[]) => {
    // if (files.length + newFiles.length > 5) {
    //   // If adding new files exceeds the limit, alert the user or handle the situation accordingly
    //   toast.error("You can only select up to five files.");
    //   return;
    // }
    let allFiles = [...newFiles];

    // Filter out files that are already selected
    // allFiles = allFiles.filter(
    //   (file) => !selectedFileNames.includes(file.name)
    // );

    // Update state with new files
    setAttachmentFiles([...newFiles]);

    // Update selected file names
    const newFileNames = allFiles.map((file) => file.name);
    // setSelectedFileNames([...selectedFileNames, ...newFileNames]);
  };

  return (
    <div>
      <div className="container-fluid">
        <div className="pt_title">
          <div className="pt_breadcrumbs">
            <BreadCrumbs
              routePaths={[
                {
                  path: AppRoutes.ADMIN_DASHBOARD,
                  name: "Home",
                },
                {
                  path: AppRoutes.RESOURCE_GUIDES_LIST,
                  name: "Resource guide",
                },
              ]}
              activeRoute={
                isEdit ? "Edit resource guide" : "Add resource guide"
              }
            />
          </div>
          {wrongStatusCheck === "Deleted" ? (
            <div className="text_center">
              Respective details are no longer available
            </div>
          ) : (
            <div className="pt_smallbgimage">
              <div className="pt_centered">
                <div className="pt_centeredinner">
                  <div className="pt_box_transparent_cp">
                    <div className="grid">
                      <div className="pt_login">
                        <h4>
                          {isEdit
                            ? "Edit resource guide"
                            : "Add resource guide"}
                        </h4>
                        <br />
                        <form onSubmit={formik.handleSubmit}>
                          <SearchableSelect
                            placeholder={"Categories"}
                            required
                            label={"Category"}
                            name={"category"}
                            renderKey="label"
                            options={categoryOptions}
                            valueKey="value"
                            onChange={(selectedOption: any) => {
                              formik.setFieldValue(
                                "category",
                                selectedOption?.value
                              );
                              setSelectCategoryData(selectedOption);
                            }}
                            selectedData={selectCategoryData}
                          />
                          <br />
                          <FormikControl
                            control={InputType.TEXT_FIELD}
                            label={"Title"}
                            name={"Title"}
                            placeholder=""
                            error={formik.errors?.Title}
                            showError={
                              formik.touched.Title && formik.errors.Title
                            }
                            required
                            onChange={(e: any) =>
                              formik?.setFieldValue("Title", e?.target?.value)
                            }
                            onBlur={formik.handleBlur("Title")}
                            value={formik.values?.Title}
                          />
                          <br />
                          <small>
                            Content <span className="required">*</span>
                          </small>
                          <CustomEditor
                            onChange={(data: any) => {
                              handleEditorChange(data);
                            }}
                            value={editorContent}
                          />
                          {contentError && (
                            <div>
                              <i
                                className="fa fa-exclamation-triangle"
                                style={{ color: "red" }}
                              ></i>
                              &nbsp;&nbsp;
                              <span style={{ color: "red" }}>
                                {contentError}
                              </span>
                            </div>
                          )}
                          <br />
                          <FormikControl
                            control={InputType.TEXT_FIELD}
                            label={"Tags"}
                            name={"tags"}
                            placeholder=""
                            error={formik.errors?.tags}
                            showError={
                              formik.touched.tags && formik.errors.tags
                            }
                            onChange={(e: any) =>
                              formik?.setFieldValue("tags", e?.target?.value)
                            }
                            onBlur={formik.handleBlur("tags")}
                            value={formik.values?.tags}
                          />
                          <FormikControl
                            placeholder={"Status"}
                            required
                            label={"Status"}
                            name={"Status"}
                            control={InputType.SELECT}
                            renderKey="label"
                            options={addEditStatusOptions}
                            valueKey="value"
                            disabled={false}
                            error={formik.errors.Status}
                            showError={
                              formik.touched.Status && formik.errors.Status
                            }
                            value={formik.values?.Status}
                            onBlur={formik.handleBlur("Status")}
                            onChange={(selectedOption: any) => {
                              formik.setFieldValue(
                                "Status",
                                selectedOption?.value
                              );
                              setSelectedStatusData(selectedOption);
                            }}
                            returnSelectedObject
                          />
                          <div className="grid">
                            <div>
                              {isEdit && (
                                <>
                                  <small>Resource guide banner</small>
                                  {!imagePathUrl && files.length === 0 && (
                                    <div style={{ marginTop: "4px" }}>
                                      <FileSelector
                                        handleSave={(files) => {
                                          if (files.length > 0) {
                                            const fileArray = Array.from(
                                              files
                                            ) as File[];
                                            const newFileArray = fileArray.map(
                                              (file) => {
                                                const newFileName = file.name; //`${fileNameUUID}.${file.name.split('.').pop()}`;
                                                const newFile = new File(
                                                  [file],
                                                  newFileName,
                                                  {
                                                    type: file.type,
                                                  }
                                                );
                                                return newFile;
                                              }
                                            );
                                            setFiles(newFileArray);
                                          }
                                        }}
                                        acceptedFileFormats={imageTypeFormats}
                                        multiple={false}
                                        maximumSize={2 * 1024}
                                        onError={(error) => {
                                          showErrorToast(
                                            `Max Allowed file size is ${2} Mb`
                                          );
                                        }}
                                      >
                                        <CustomButton
                                          buttonName={"Choose files"}
                                          buttonType={buttonType.PRIMARY}
                                          actionType="button"
                                        />
                                      </FileSelector>
                                    </div>
                                  )}
                                  {(imagePathUrl || files.length > 0) && (
                                    <div>
                                      <Image
                                        width={100}
                                        height={100}
                                        src={
                                          imagePathUrl ||
                                          URL.createObjectURL(files[0])
                                        }
                                        alt={"image"}
                                        unoptimized
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                          borderRadius: 10,
                                        }}
                                      />

                                      {imagePathUrl ? (
                                        <CustomButton
                                          styles={{
                                            marginTop: "1rem",
                                            marginBottom: "1rem",
                                          }}
                                          buttonName={"Delete"}
                                          buttonType={`${buttonType.CONTRAST} ${buttonType.SMALL_BUTTON}`}
                                          iconClassName={"fa-light fa-trash"}
                                          actionType="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setOpenModal(true);
                                          }}
                                        />
                                      ) : (
                                        <CustomButton
                                          styles={{
                                            marginTop: "1rem",
                                            marginBottom: "1rem",
                                          }}
                                          buttonName={"Remove"}
                                          buttonType={`${buttonType.CONTRAST} ${buttonType.SMALL_BUTTON}`}
                                          iconClassName={"fa-light fa-remove"}
                                          actionType="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setFiles([]);
                                          }}
                                        />
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                              {!isEdit && (
                                <>
                                  <small>Resource guide banner</small>
                                  {files.length === 0 && (
                                    <div style={{ marginTop: "4px" }}>
                                      <FileSelector
                                        handleSave={(files) => {
                                          if (files.length > 0) {
                                            const fileArray = Array.from(
                                              files
                                            ) as File[];
                                            const newFileArray = fileArray.map(
                                              (file) => {
                                                const newFileName = file.name; //`${fileNameUUID}.${file.name.split('.').pop()}`;
                                                const newFile = new File(
                                                  [file],
                                                  newFileName,
                                                  {
                                                    type: file.type,
                                                  }
                                                );
                                                return newFile;
                                              }
                                            );
                                            setFiles(newFileArray);
                                          }
                                        }}
                                        acceptedFileFormats={imageTypeFormats}
                                        multiple={false}
                                        maximumSize={2 * 1024}
                                        onError={(error) => {
                                          showErrorToast(
                                            `Max Allowed file size is ${2} Mb`
                                          );
                                        }}
                                      >
                                        <CustomButton
                                          buttonName={"Choose files"}
                                          buttonType={buttonType.PRIMARY}
                                          actionType="button"
                                        />
                                      </FileSelector>
                                    </div>
                                  )}
                                  {files.length > 0 && (
                                    <div style={{ display: "inline-block" }}>
                                      <Image
                                        width={100}
                                        height={100}
                                        src={URL.createObjectURL(files[0])}
                                        alt={"image"}
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                          borderRadius: 10,
                                        }}
                                      />
                                      <CustomButton
                                        styles={{
                                          marginTop: "1rem",
                                          marginBottom: "1rem",
                                        }}
                                        buttonName={"Remove"}
                                        buttonType={`${buttonType.CONTRAST} ${buttonType.SMALL_BUTTON}`}
                                        iconClassName={"fa-light fa-remove"}
                                        actionType="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setFiles([]);
                                        }}
                                      />
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                            <div>
                              <small>Attachment</small>
                              <MultipleFileHandler
                                titleName=""
                                afterFileChange={(modifiedFiles: any) => {
                                  setAttachmentUrl(modifiedFiles);
                                  handleFileChange(modifiedFiles);
                                }}
                                existingFiles={attachmentUrl}
                                filesToAccept={`${uploadFile.pdf},${uploadFile.word},${uploadFile.excel}`}
                                disableChooseFileBtn={attachmentUrl.length >= 1}
                                hideDeleteButton={false}
                                customDeleteFunction={(modifiedFiles: any) => {
                                  handleRemoveAttachmentConfirmed(
                                    modifiedFiles
                                  );
                                }}
                                deleteAfterConfirmation={true}
                              />
                            </div>
                          </div>
                          <div className="grid" style={{ marginTop: "2 rem" }}>
                            <input
                              type="button"
                              value="Cancel"
                              className="outline contrast"
                              onClick={() => {
                                showInfoToast("No changes saved");
                                router.push(AppRoutes.RESOURCE_GUIDES_LIST);
                              }}
                              disabled={isLoading}
                            />
                            <input
                              type="submit"
                              value={isEdit ? "Update" : "Save"}
                              className="secondary"
                              disabled={isLoading}
                            />
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {openModal && (
            <BaseModal
              displayModal={openModal}
              onClose={() => {
                setOpenModal(false);
              }}
              firstButtonName="Cancel"
              secondButtonName="Remove"
              title="Confirmation"
              onConfirm={() => {
                handleRemoveConfirmed();
                return true;
              }}
            >
              Are you sure you want to remove the image?
            </BaseModal>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddEditResource;
