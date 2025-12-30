"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useRouter } from "next/navigation";

import { useParams } from "next/navigation";

import FileSelector from "@/components/fileSelector/fileSelector";
import Image from "next/image";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
  showWarningToast,
} from "@/components/Toaster";
import {
  AdminAddBlogResource,
  adminDeleteBlogResAttachment,
  AdminFetchAllMasterTypeDetails,
  AdminGetBlogResourceById,
  AdminUpdateBlogResource,
  CheckBlogResourceNameExistence,
} from "./addEditBlog.function";
import { useTokenDetails } from "@/hooks";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  buttonType,
  imageTypeFormats,
  InputType,
} from "@/shared/constant/general";
import FormikControl from "@/components/FormikControl";
import CustomButton from "@/components/CustomButton/CustomButton";
import BaseModal from "@/components/BaseModal";
import BreadCrumbs from "@/components/BreadCrumbs";
import CustomEditor from "@/components/Editor/Editor";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import TabSwitch from "@/components/TabSwitch";
import CommentsList from "./commentsList";
import {
  addEditStatusOptions,
  tabsOptions,
} from "../BlogList/blogList.constant";
import { singleUploadApi } from "@/app/api/commonApi";
import { useLoaderContext } from "@/context/useLoader";

const BlogDetails = () => {
  const router = useRouter();
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [editData, setEditData] = useState<any>({});

  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const params = useParams();
  const isEdit = params?.id ? true : false;
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [editorContent, setEditorContent] = useState("");
  const [wrongStatusCheck, setWrongStatusCheck] = useState("");

  const [selectedStatusData, setSelectedStatusData] = useState<any>("Draft");
  const [selectCategoryData, setSelectCategoryData] = useState<any>({
    value: "91fb1e89-dc1d-44e2-a98b-dfce0c0c5167",
    label: "Uncategorized",
  });
  const [files, setFiles] = useState<File[]>([]);
  const { setLoader, setLoaderInfo }: any = useLoaderContext();

  const [imagePathUrl, setImagePathUrl] = useState("");
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState("Blog Definition");
  const [contentError, setContentError] = useState("");

  useEffect(() => {
    (async () => {
      const categoryData = await AdminFetchAllMasterTypeDetails(
        "Blog Category"
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
      if (editorContent.length === 0) {
        setContentError("Please enter the blog content");
        showWarningToast("Blog content cannot be empty.");
        return;
      }
      let payload = {
        categoryId: category || "",
        content: editorContent,
        content_type: "Blog",
        tags: tags.split(", ") || [],
        title: Title,
        blog_status: Status,
        enable_comments: enableComments,
      };
      try {
        setIsLoading(true);
        setLoader(true);
        setLoaderInfo(isEdit ? "Updating blog..." : "Saving blog...");
        if (isEdit) {
          if (
            Title === editData?.title &&
            Status === editData?.blog_status &&
            category === editData?.category?.id &&
            tags === editData?.tags.toString() &&
            files.length === 0 &&
            editorContent === editData?.content &&
            enableComments === (editData?.enable_comments ?? true)
          ) {
            showInfoToast("No changes to save");
            setIsLoading(false);
            return;
          }
          let modifiedPayload = {
            ...payload,
            id: editData?.id,
          };
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
            "Your blog post has been updated",
            setIsLoading
          );
          if (response) {
            router.push(AppRoutes.ADMIN_BLOG);
          }
        } else {
          let response = await AdminAddBlogResource(payload);
          if (response?.id) {
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
            showSuccessToast("Your blog post has been Saved");
            router.push(AppRoutes.ADMIN_BLOG);
          }
          setIsLoading(false);
        }
      } catch (err) {
        showErrorToast("Something went wrong");
      } finally {
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

  const handleEditorChange = (content: any) => {
    setEditorContent(content);
    setContentError("");
  };

  const imageURL = useMemo(() => {
    if (files && files.length > 0) {
      return URL.createObjectURL(files[0]);
    }
    return "";
  }, [files]);

  const renderTabSwitch = () => {
    switch (activeTab) {
      case "Blog Definition":
        return (
          <div className="pt_smallbgimage">
            <div className="pt_centered">
              <div className="pt_centeredinner">
                <div className="pt_box_transparent_cp">
                  <div className="grid">
                    <div className="pt_login">
                      <h4>{isEdit ? "Edit blog" : "Add blog"}</h4>
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
                            <span style={{ color: "red" }}>{contentError}</span>
                          </div>
                        )}
                        <br />
                        <FormikControl
                          control={InputType.TEXT_FIELD}
                          label={"Tags"}
                          name={"tags"}
                          placeholder=""
                          error={formik.errors?.tags}
                          showError={formik.touched.tags && formik.errors.tags}
                          required
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
                                <small>Blog banner</small>
                                {!imagePathUrl && files.length === 0 && (
                                  <div>
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
                                      onError={() => {
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
                                      src={imagePathUrl || imageURL}
                                      alt={"image"}
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
                                <small>Blog banner</small>
                                {files.length === 0 && (
                                  <div>
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
                                      onError={() => {
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
                                      src={imageURL}
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
                            <FormikControl
                              id={"EnableComments"}
                              name={"Enable Comments"}
                              control={InputType.CHECKBOX}
                              options={[
                                {
                                  value: formik?.values?.enableComments,
                                  label: "Enable comments",
                                },
                              ]}
                              onChange={(e: any) =>
                                formik.setFieldValue(
                                  "enableComments",
                                  e.target.checked
                                )
                              }
                              selectedValue={
                                formik.values.enableComments || "false"
                              }
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
                              router.push("/admin/blog");
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
        );
      case "Blog Comments":
        return (
          <>
            <div className="pt_smallbgimage">
              <div className="pt_centered">
                <div className="pt_centeredinner">
                  <div className="pt_box_transparent_cp">
                    <div className="container-fluid">
                      {!wrongIdCheck &&
                        isEdit &&
                        activeTab === "Blog Comments" && (
                          <div>
                            <strong>Title : </strong>
                            <span style={{ fontWeight: "300" }}>
                              {editData?.title}
                            </span>
                          </div>
                        )}
                    </div>
                    <CommentsList />
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      default:
        return <></>;
    }
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
                  path: AppRoutes.ADMIN_BLOG,
                  name: "Blogs",
                },
              ]}
              activeRoute={isEdit ? "Edit blog" : "Add blog"}
            />
          </div>

          {/* <span>{`${isEdit ? "Edit" : "Add"} Blog`}</span> */}
          <br />
          {!wrongIdCheck && isEdit && wrongStatusCheck !== "Deleted" && (
            <div className="pt_filters">
              <TabSwitch tabOptions={tabsOptions} onChange={setActiveTab} />
            </div>
          )}
          {wrongIdCheck ? (
            <div className="text_center">No data available on this ID</div>
          ) : wrongStatusCheck === "Deleted" ? (
            <div className="text_center">
              Respective details are no longer available
            </div>
          ) : (
            renderTabSwitch()
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

export default BlogDetails;
