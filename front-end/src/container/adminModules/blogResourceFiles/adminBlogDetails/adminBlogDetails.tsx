"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import { useFormik } from "formik";
import * as Yup from "yup";
import { ExclamationTriangleFill, Trash, XCircle } from "react-bootstrap-icons";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import FormButton from "@/components/Button/button";
import styles from "./adminBlogDetails.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import commonStyles from "./../../../../common/commonStyles.module.scss";

import { useDebouncedFieldCheck, useTokenDetails } from "@/common/commonHooks";
import { ApplicationURLS } from "@/common/applicationURLS";
import { useParams } from "next/navigation";
import { singleUploadApi } from "@/app/api/commonAPIs";
import { toast } from "@/app/Toaster";
import {
  AdminAddBlogResource,
  AdminGetBlogResourceById,
  AdminUpdateBlogResource,
  AdminfetchAllMasterTypeDetails,
  adminDeleteBlogResAttachment,
} from "../blogResource.functions";
import CustomEditor from "@/components/editor/editor";
import FileSelector from "@/components/fileSelector/fileSelector";
import { imageTypeFormats } from "@/common/constants/general";
import Image from "next/image";
import { AppModal } from "@/components/model/model";
import TabContainer from "@/container/addGroups/tabsContainer";
import CommentsList from "../blogComments/blogCommnets";
import { CheckBlogResourceNameExistence } from "@/app/api/existanceAPIsCheck";
import CheckBox from "@/components/CheckBox/checkBox";

const BlogDetails = (props: any) => {
  const { isEdit = false } = props;
  const statusOptions = [
    { value: "Draft", label: "Draft" },
    { value: "Published", label: "Published" },
    { value: "Unpublished", label: "Unpublished" },
  ];
  const tabs = [
    { id: "blogDefinition", label: "Blog Definition", hasError: false },
    { id: "blogComments", label: "Blog Comments", hasError: true },
  ];
  const routePath = usePathname();
  const router = useRouter();
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [editData, setEditData] = useState<any>({});

  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const params = useParams();
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [editorContent, setEditorContent] = useState("");
  const [selectedStatusData, setSelectedStatusData] = useState<any>(
    statusOptions[0]
  );
  const [selectCategoryData, setSelectCategoryData] = useState<any>({
    value: "91fb1e89-dc1d-44e2-a98b-dfce0c0c5167",
    label: "Uncategorized",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [imagePathUrl, setImagePathUrl] = useState("");
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [contentError, setContentError] = useState("");

  useEffect(() => {
    (async () => {
      const categoryData = await AdminfetchAllMasterTypeDetails(
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
      let selStatusOpt =
        statusOptions.find((each) => each.value === editData?.blog_status) ||
        {};
      setSelectedStatusData(selStatusOpt);

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
      if (editorContent.length === 0) {
        setContentError("Please enter the blog content");
        toast.warn("Blog content cannot be empty.");
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
      setIsLoading(true);
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
          toast.info("No changes to save");
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
          router.push(ApplicationURLS.ADMIN_BLOG);
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
          toast.success("Your blog post has been Saved");
          router.push(ApplicationURLS.ADMIN_BLOG);
        }
        setIsLoading(false);
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

  const handleTitleChange = useCallback((e: any) => {
    let titleName = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("Title", titleName);
  }, []);

  const handleTagsChange = useCallback((e: any) => {
    let tagsName = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("tags", tagsName);
  }, []);
  const handleEditorChange = (content: any) => {
    setEditorContent(content);
    setContentError("");
  };
  const handleTabClick = (tabId: string) => {
    if (activeTab === tabId) {
      return;
    }
    setActiveTab(tabId);
  };

  const renderTabSwitch = () => {
    switch (activeTab) {
      case "blogDefinition":
        return (
          <Form
            onSubmit={formik.handleSubmit}
            noValidate
            className={styles.formStyle}
          >
            <Row className={`${styles.textFieldStyles}`}>
              <Col lg={6}>
                <SearchableSelect
                  key={timeKey}
                  options={categoryOptions}
                  selectedData={selectCategoryData}
                  onChange={(selectedOption) => {
                    formik.handleChange("category")(selectedOption.value);
                    setSelectCategoryData(selectedOption);
                  }}
                  placeholder="Categories"
                  controlStyles={customStyles}
                  label="Category  *"
                  isRequired={
                    !formik?.values?.category && formik.touched.category
                      ? true
                      : false
                  }
                  errorMessage={formik?.errors?.category as string}
                />
              </Col>
            </Row>
            <Row className={`${styles.textFieldStyles}`}>
              <Col className={styles.eachFieldBottom}>
                <TextField
                  placeholder=""
                  type="text"
                  errorText={formik?.errors?.Title as string}
                  isInvalid={
                    formik?.touched?.Title && formik?.errors?.Title
                      ? true
                      : false
                  }
                  labelText="Title *"
                  name="Title"
                  id="Title"
                  required
                  value={formik.values.Title}
                  onChange={handleTitleChange}
                  // onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  classNames={commonStyles.inputFieldControl}
                />
              </Col>
            </Row>
            <Row className={`${styles.textFieldStyles}`}>
              <Col className={styles.eachFieldBottom}>
                <Form.Label className={styles.desc}>Content *</Form.Label>
                <CustomEditor
                  onChange={(data: any) => {
                    handleEditorChange(data);
                  }}
                  value={editorContent}
                />
                {contentError && (
                  <div className={styles.errorContainer}>
                    <ExclamationTriangleFill
                      className={styles.crossIconStyles}
                    />
                    <span className={styles.errorTextStyles}>
                      {contentError}
                    </span>
                  </div>
                )}
              </Col>
            </Row>
            <Row className={`${styles.textFieldStyles}`}>
              <Col lg={6} className={styles.eachFieldBottom}>
                <TextField
                  placeholder=""
                  type="text"
                  errorText={formik?.errors?.tags as string}
                  isInvalid={
                    formik?.touched?.tags && formik?.errors?.tags ? true : false
                  }
                  labelText="Tags"
                  name="tags"
                  id="tags"
                  required
                  value={formik.values.tags}
                  onChange={handleTagsChange}
                  onBlur={formik.handleBlur}
                  classNames={commonStyles.inputFieldControl}
                />
              </Col>
              <Col lg={6}>
                <SearchableSelect
                  key={timeKey}
                  options={statusOptions}
                  selectedData={selectedStatusData}
                  onChange={(selectedOption) => {
                    formik.handleChange("Status")(selectedOption.value);
                    setSelectedStatusData(selectedOption);
                  }}
                  placeholder="Status"
                  controlStyles={customStyles}
                  label="Status *"
                  isRequired={
                    !formik?.values?.Status && formik.touched.Status
                      ? true
                      : false
                  }
                  errorMessage={formik?.errors?.Status as string}
                />
              </Col>
            </Row>
            <Row className={`${styles.textFieldStyles}`}>
              {isEdit && (
                <Col sm={6}>
                  <Col sm={6}>
                    <span>Resource Guide Banner</span>
                  </Col>
                  <Col sm={6}>
                    {!imagePathUrl && files.length === 0 && (
                      <div className={styles.selectContainerBtn}>
                        <FileSelector
                          handleSave={(files) => {
                            if (files.length > 0) {
                              const fileArray = Array.from(files) as File[];
                              const newFileArray = fileArray.map((file) => {
                                const newFileName = file.name; //`${fileNameUUID}.${file.name.split('.').pop()}`;
                                const newFile = new File([file], newFileName, {
                                  type: file.type,
                                });
                                return newFile;
                              });
                              setFiles(newFileArray);
                            }
                          }}
                          acceptedFileFormats={imageTypeFormats}
                          multiple={false}
                          maximumSize={2 * 1024}
                          onError={(error) => {
                            toast.error(`Max Allowed file size is ${2} Mb`);
                          }}
                        >
                          <div className={styles.selectContainer}>
                            add image
                          </div>
                        </FileSelector>
                      </div>
                    )}
                    {(imagePathUrl || files.length > 0) && (
                      <div
                        style={{ display: "inline-block" }}
                        className={styles.imageViewStyle}
                      >
                        {imagePathUrl ? (
                          <Trash
                            className={styles.fileRemoveIcon}
                            onClick={() => {
                              setOpenModal(true);
                            }}
                          />
                        ) : (
                          <XCircle
                            className={styles.fileRemoveIcon}
                            onClick={() => {
                              setFiles([]);
                            }}
                          />
                        )}
                        <Image
                          width={100}
                          height={100}
                          src={imagePathUrl || URL.createObjectURL(files[0])}
                          alt={"image"}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderRadius: 10,
                          }}
                        />
                      </div>
                    )}
                  </Col>
                </Col>
              )}
              {!isEdit && (
                <Col sm={6}>
                  <Col sm={6}>
                    <span>Blog Banner</span>
                  </Col>
                  <Col sm={6}>
                    {files.length === 0 && (
                      <div className={styles.selectContainerBtn}>
                        <FileSelector
                          handleSave={(files) => {
                            if (files.length > 0) {
                              const fileArray = Array.from(files) as File[];
                              const newFileArray = fileArray.map((file) => {
                                const newFileName = file.name; //`${fileNameUUID}.${file.name.split('.').pop()}`;
                                const newFile = new File([file], newFileName, {
                                  type: file.type,
                                });
                                return newFile;
                              });
                              setFiles(newFileArray);
                            }
                          }}
                          acceptedFileFormats={imageTypeFormats}
                          multiple={false}
                          maximumSize={2 * 1024}
                          onError={(error) => {
                            toast.error(`Max Allowed file size is ${2} Mb`);
                          }}
                        >
                          <div className={styles.selectContainer}>
                            add image
                          </div>
                        </FileSelector>
                      </div>
                    )}
                    {files.length > 0 && (
                      <div
                        style={{ display: "inline-block" }}
                        className={styles.imageViewStyle}
                      >
                        <XCircle
                          className={styles.fileRemoveIcon}
                          onClick={() => {
                            setFiles([]);
                          }}
                        />
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
                      </div>
                    )}
                  </Col>
                </Col>
              )}
              <Col sm={6}>
                <span>Enable Comments</span>
                <CheckBox
                  checked={formik.values.enableComments}
                  className={styles.checkBoxHeights}
                  onChange={(e) =>
                    formik.setFieldValue("enableComments", e.target.checked)
                  }
                  label=""
                  id="Enable Comments"
                />
              </Col>
            </Row>
            <div className={styles.btnContainer}>
              <FormButton
                type={"button"}
                className={styles.cancelBtnStyle}
                disabled={isLoading}
                onClick={() => {
                  toast.info("No changes saved");
                  router.push(ApplicationURLS.ADMIN_BLOG);
                }}
              >
                Cancel
              </FormButton>
              <FormButton
                type={"submit"}
                className={styles.saveBtnStyle}
                disabled={isLoading}
              >
                {isEdit ? "Update" : "Save"}
              </FormButton>
            </div>
          </Form>
        );
      case "blogComments":
        return <CommentsList />;
      default:
        return <></>;
    }
  };

  return (
    <div className={styles.mainCon}>
      <ReusableBreadcrumb
        items={[
          {
            href: ApplicationURLS.ADMIN_DASHBOARD,
            label: "Home",
            active: false,
          },
          {
            href: ApplicationURLS.ADMIN_BLOG,
            label: "Blogs",
            active: false,
          },
          {
            href: "",
            label: isEdit ? "Edit Blog" : "Add Blog",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />

      <Row>
        <span className={styles.headerText}>{`${
          isEdit ? "Edit" : "Add"
        } Blog`}</span>
      </Row>

      {!wrongIdCheck && isEdit && (
        <TabContainer
          tabs={tabs}
          activeTab={activeTab}
          onTabClick={handleTabClick}
        />
      )}
      {!wrongIdCheck && isEdit && activeTab === "blogComments" && (
        <div>
          <span className={styles.titleHeading}>Title : </span>
          <span className={styles.titleText}>{editData?.title}</span>
        </div>
      )}

      {wrongIdCheck ? (
        <div className={styles.noDataStyle}>No data available on this id</div>
      ) : (
        renderTabSwitch()
      )}
      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        firstButtonLabel="Remove"
        secondButtonLabel="Cancel"
        modalBodyContent="Are you sure you want to remove the image?"
        onConfirm={handleRemoveConfirmed}
      />
    </div>
  );
};

export default BlogDetails;
