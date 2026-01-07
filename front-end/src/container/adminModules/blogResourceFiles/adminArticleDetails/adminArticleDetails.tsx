"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import { useFormik } from "formik";
import * as Yup from "yup";
import { FiletypeDoc, Paperclip, Trash, XCircle } from "react-bootstrap-icons";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import FormButton from "@/components/Button/button";
import styles from "./adminArticleDetails.module.scss";
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
import { fileTypeFormats, imageTypeFormats } from "@/common/constants/general";
import Image from "next/image";
import { BlogResource } from "../blogResource.types";
import { AppModal } from "@/components/model/model";
import { CheckBlogResourceNameExistence } from "@/app/api/existanceAPIsCheck";

const ArticleDetails = (props: any) => {
  const { setActionScreen, isEdit = false, ...rest } = props;
  const statusOptions = [
    { value: "Draft", label: "Draft" },
    { value: "Published", label: "Published" },
    { value: "Unpublished", label: "Unpublished" },
  ];
  const routePath = usePathname();
  const router = useRouter();
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [editData, setEditData] = useState<BlogResource | any>({});

  const [wrongIdCheck, setWorngIdCheck] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const params = useParams();
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [editorContent, setEditorContent] = useState("");
  const [selectedStatusData, setSelectedStatusData] = useState<any>(
    statusOptions[0]
  );
  const [selectCategoryData, setSelectCategoryData] = useState<any>({
    value: "69dabbc7-6c43-43df-a7c2-6820eda53919",
    label: "Uncategorized",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [attachmentUrl, setAttachmentUrl] = useState<any>([]);
  const [imagePathUrl, setImagePathUrl] = useState("");
  const [openModal, setOpenModal] = useState<any>({
    isOpen: false,
    typeOfmodal: "",
  });

  useEffect(() => {
    (async () => {
      const categoryData = await AdminfetchAllMasterTypeDetails(
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
          setEditData(resourceData);
        } else {
          setWorngIdCheck(true);
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
      setAttachmentUrl(
        editData?.attachment?.file_path ? [editData?.attachment] : []
      );
      setTimeKey(new Date().getTime());
    }
  }, [isEdit, editData]);

  const validationSchema = Yup.object().shape({
    Title: Yup.string()
      .required("Please enter the resource guide title")
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
      isTitleExistence: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      if (editorContent.length === 0 && attachmentFiles.length === 0) {
        toast.warn(
          "Either Resource content or attachment file cannot be empty"
        );
        return;
      }
      const { category, tags, Title, Status } = values;
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
      if (isEdit) {
        if (
          Title === editData?.title &&
          Status === editData?.blog_status &&
          category === editData?.category?.id &&
          tags === editData?.tags.toString() &&
          files.length === 0 &&
          attachmentFiles.length === 0 &&
          editorContent === editData?.content
        ) {
          toast.info("No changes to save");
          setIsLoading(false);
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
          "Your Resource has been updated",
          setIsLoading
        );
        if (response) {
          router.push(ApplicationURLS.ADMIN_ARTICLE);
        }
      } else {
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
          toast.success("Your Resource has been Saved");
          router.push(ApplicationURLS.ADMIN_ARTICLE);
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

  const handleRemoveBannerConfirmed = async () => {
    setOpenModal({
      isOpen: false,
      typeOfmodal: "",
    });
    const payload = {
      attachmentType: "Blog_banner",
      blogResId: editData?.id,
    };
    let response = await adminDeleteBlogResAttachment(payload);
    if (response) {
      setImagePathUrl("");
    }
  };
  const handleRemoveAttachemntConfirmed = async () => {
    setOpenModal({
      isOpen: false,
      typeOfmodal: "",
    });
    const payload = {
      attachmentType: "Resource_attachments",
      blogResId: editData?.id,
    };
    let response = await adminDeleteBlogResAttachment(payload);
    if (response) {
      setAttachmentUrl([]);
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
  };

  // Function to handle file change
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
    <div className={styles.mainCon}>
      <ReusableBreadcrumb
        items={[
          {
            href: ApplicationURLS.ADMIN_DASHBOARD,
            label: "Home",
            active: false,
          },
          {
            href: ApplicationURLS.ADMIN_ARTICLE,
            label: "Resource Guide",
            active: false,
          },
          {
            href: "",
            label: isEdit ? "Edit Resource Guide" : "Add Resource Guide",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      {wrongIdCheck ? (
        <div className={styles.noDataStyle}>No data available on this id</div>
      ) : (
        <Form
          onSubmit={formik.handleSubmit}
          noValidate
          className={styles.formStyle}
        >
          <Row>
            <span className={styles.headerText}>{`${
              isEdit ? "Edit" : "Add"
            } Resource Guide`}</span>
          </Row>
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
                label="Category *"
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
                  formik?.touched?.Title && formik?.errors?.Title ? true : false
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
              <Form.Label className={styles.desc}>Content</Form.Label>
              <CustomEditor
                onChange={(data: any) => {
                  handleEditorChange(data);
                }}
                // suppresshydrationwarning={true}
                value={editorContent}
              />
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
              <Col lg={6}>
                <Col lg={6}>
                  <span>Resource Guide Banner</span>
                </Col>
                <Col lg={6}>
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
                        <div className={styles.selectContainer}>add image</div>
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
                            setOpenModal({
                              isOpen: true,
                              typeOfmodal: "banner",
                            });
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
              <Col lg={6}>
                <Col lg={6}>
                  <span>Resource Guide Banner</span>
                </Col>
                <Col lg={6}>
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
                        <div className={styles.selectContainer}>add image</div>
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
            {/* {viewFileData?.length > 0} */}
            <Col lg={6}>
              <Col>
                <span>Attachment</span>
              </Col>
              {(attachmentFiles?.length > 0 || attachmentUrl?.length > 0) &&
                isEdit && (
                  <Col className={styles.filesviewContanier}>
                    {(attachmentFiles.length > 0
                      ? attachmentFiles
                      : attachmentUrl
                    ).map((eachFile: any, index: number) => {
                      return (
                        <div className={styles.eachFielDetailsView} key={index}>
                          {!isEdit && (
                            <XCircle
                              className={styles.fileRemoveIcon}
                              onClick={() => {
                                // Filter out the file that needs to be removed
                                const updatedFiles = attachmentFiles.filter(
                                  (file, i) => i !== index
                                );
                                setAttachmentFiles(updatedFiles);
                              }}
                            />
                          )}
                          {attachmentUrl.length > 0 ? (
                            <Trash
                              className={styles.fileRemoveIcon}
                              onClick={() => {
                                setOpenModal({
                                  isOpen: true,
                                  typeOfmodal: "attachment",
                                });
                              }}
                            />
                          ) : (
                            <XCircle
                              className={styles.fileRemoveIcon}
                              onClick={() => {
                                setAttachmentFiles([]);
                              }}
                            />
                          )}
                          <div className={styles.eachFile}>
                            {imageTypeFormats.includes(
                              eachFile?.type || eachFile?.file_type
                            ) ? (
                              <Image
                                width={100}
                                height={100}
                                // src={imageUrl}
                                src={
                                  attachmentUrl?.length > 0
                                    ? eachFile?.file_path
                                    : URL.createObjectURL(eachFile)
                                }
                                // src={eachFile?.file_path}
                                alt={
                                  eachFile?.name ||
                                  eachFile?.file_name ||
                                  "image"
                                }
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  borderRadius: 10,
                                }}
                              />
                            ) : (
                              <FiletypeDoc />
                            )}
                          </div>
                          <span
                            className={styles.nameStyles}
                            title={eachFile?.name || eachFile?.file_name}
                          >
                            {eachFile?.name || eachFile?.file_name}
                          </span>
                        </div>
                      );
                    })}
                  </Col>
                )}
              {attachmentFiles?.length > 0 && !isEdit && (
                <Col className={styles.filesviewContanier}>
                  {attachmentFiles.map((eachFile: any, index: number) => {
                    return (
                      <div className={styles.eachFielDetailsView} key={index}>
                        <XCircle
                          className={styles.fileRemoveIcon}
                          onClick={() => {
                            // Filter out the file that needs to be removed
                            const updatedFiles = attachmentFiles.filter(
                              (file, i) => i !== index
                            );
                            setAttachmentFiles(updatedFiles);
                          }}
                        />

                        <div className={styles.eachFile}>
                          {imageTypeFormats.includes(
                            eachFile?.type || eachFile?.file_type
                          ) ? (
                            <Image
                              width={100}
                              height={100}
                              // src={imageUrl}
                              src={URL.createObjectURL(eachFile)}
                              alt={
                                eachFile?.name || eachFile?.file_name || "image"
                              }
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                borderRadius: 10,
                              }}
                            />
                          ) : (
                            <FiletypeDoc />
                          )}
                        </div>
                        <span
                          className={styles.nameStyles}
                          title={eachFile?.name || eachFile?.file_name}
                        >
                          {eachFile?.name || eachFile?.file_name}
                        </span>
                      </div>
                    );
                  })}
                </Col>
              )}
              {attachmentFiles?.length < 1 && attachmentUrl.length < 1 && (
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
                  acceptedFileFormats={[...fileTypeFormats]}
                  multiple={false}
                  maximumSize={5 * 1024}
                  onError={(error) => {
                    toast.error(`Max Allowed file size is ${5} Mb`);
                  }}
                >
                  <span className={styles.fileSelectorContainer}>
                    <Paperclip /> Select file
                  </span>
                </FileSelector>
              )}
            </Col>
          </Row>
          <div className={styles.btnContianer}>
            <FormButton
              type={"button"}
              className={styles.cancelBtnStyle}
              onClick={() => {
                toast.info("No changes saved");
                router.push(ApplicationURLS.ADMIN_ARTICLE);
              }}
              disabled={isLoading}
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
      )}
      <AppModal
        show={openModal.isOpen}
        onHide={() =>
          setOpenModal({
            isOpen: false,
            typeOfmodal: "",
          })
        }
        firstButtonLabel="Remove"
        secondButtonLabel="Cancel"
        modalBodyContent="Are you sure you want to remove the image?"
        onConfirm={() => {
          openModal?.typeOfmodal === "banner"
            ? handleRemoveBannerConfirmed()
            : handleRemoveAttachemntConfirmed();
        }}
      />
    </div>
  );
};

export default ArticleDetails;
