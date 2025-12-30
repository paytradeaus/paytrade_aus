import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { discussionPage } from "./discussion.constant";
import YsEditor from "@/components/ysEditor";
import Link from "next/link";
import { AppRoutes } from "@/shared/constant/appRoutes";
import FormikControl from "@/components/FormikControl";
import { InputType, uploadFile, UploadImage } from "@/shared/constant/general";
import * as Yup from "yup";
import { useFormik } from "formik";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import ShowMoreLess from "@/components/MoreLessCard";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "@/components/Toaster";
import DOMPurify from "dompurify";
import MultipleFileHandler from "@/components/MultipleFileHandler";
import { deleteAttachment, multipleFileUploadApi } from "@/app/api/commonApi";
import { useTokenDetails } from "@/hooks";
import {
  addDiscussion,
  categoryDropDownData,
  categoryListAndCount,
  editDiscussion,
  getDiscussionIdeaById,
  getTopData,
} from "../Community/community.functions";
import { slugifyString } from "@/utils";
import { isEqual } from "lodash";

type DiscussionPageKeys = keyof typeof discussionPage;

interface StartDiscussionProps {
  from: DiscussionPageKeys;
  edit: boolean;
}

export default function StartDiscussion({
  from,
  edit = false,
}: StartDiscussionProps) {
  const data = discussionPage[from];
  const [selectCategoryData, setSelectCategoryData] = useState<any>();
  const editorRef = useRef<any>(null);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const [categoryOptions, setCategoryOptions] = useState();
  const [categoryListAndCountData, setCategoryListAndCountData] = useState([]);
  const [latest, setLatest] = useState([]);
  const [disableSubmitBtn, setDisableSubmitBtn] = useState(false);
  const [originalUpload, setOriginalUpload] = useState<any[]>([]);
  const [initialPatchedValues, setInitialPatchedValues] = useState<any>(null);

  const params = useParams();
  const router = useRouter();
  if (!decodeTokenData) {
    router.push("/");
    return;
  }
  const validationSchema =
    from == "start discussion"
      ? Yup.object().shape({
          title: Yup.string()
            .required(discussionPage["start discussion"].fields[0].error)
            .max(100, "Title must be at most 100 characters"),
          category: Yup.string().required(
            discussionPage["start discussion"].fields[1].error
          ),
        })
      : Yup.object().shape({
          title: Yup.string()
            .required(discussionPage["create product idea"].fields[0].error)
            .max(100, "Title must be at most 100 characters"),
          category: Yup.string(),
        });

  const formik = useFormik({
    initialValues: { title: "", category: "", id: "" },
    validationSchema,
    onSubmit: async (values) => {
      if (from == "start discussion") {
        if (!editorRef.current.getText()) {
          showErrorToast("Add detail to start your discussion");
          return;
        } else if (editorRef.current.getText()?.length > 1000) {
          showErrorToast("Details must be at most 1000 characters");
          return;
        }
      } else {
        if (editorRef.current.getText()?.length > 1000) {
          showErrorToast("Details must be at most 1000 characters");
          return;
        }
      }
      setDisableSubmitBtn(true);
      const { title, category, id = null } = values;
      if (edit) {
        console.log(initialPatchedValues, {
          form: {
            ...formik.values,
            content: editorRef.current.getHTML(),
          },
          attachment: uploadedFiles,
        });
        if (
          isEqual(initialPatchedValues, {
            form: {
              ...formik.values,
              content: editorRef.current.getHTML(),
            },
            attachment: uploadedFiles,
          })
        ) {
          showInfoToast("No changes to update");
          setDisableSubmitBtn(false);
          return;
        }
        let uploadedFilesIds: Array<string> = [];
        let response = await editDiscussion({
          updateContentInput: {
            title: title,
            content: DOMPurify.sanitize(editorRef.current.getHTML()),
            categoryId: category,
            id,
          },
        });

        if (response) {
          if (uploadedFiles?.length > 0 || originalUpload?.length > 0) {
            const userData = {
              uploaded_by: decodeTokenData?.emailId || "",
              discussion_idea_id: response.discussion_idea_id,
              attachment_type: "Discussion_idea_uploads",
            };
            const multiUserData: any[] = uploadedFiles
              .filter((val) => !val.file_path)
              .map(() => userData);
            if (multiUserData?.length > 0) {
              const fileResponse: any[] = await multipleFileUploadApi(
                uploadedFiles.filter((val) => !val.file_path),
                multiUserData,
                accessTokenId
              );
            }
            const listOfDeletedAttachment = originalUpload?.filter((val) => {
              return !uploadedFiles
                .filter((val) => val.file_path)
                .some((existing) => existing.file_path === val.file_path);
            });
            if (listOfDeletedAttachment?.length > 0) {
              listOfDeletedAttachment.forEach(async (val) => {
                const postData = {
                  attachmentId: val?.id,
                  attachmentType: "Discussion_idea_uploads",
                  id,
                };
                const success = await deleteAttachment(postData);
              });
            }

            showSuccessToast(
              from == "create product idea"
                ? "Product idea updated successfully"
                : "Discussion updated successfully"
            );
            router.push(
              `/community/${data.communityLink}/${slugifyString(
                response?.category?.value || "All"
              )}/${slugifyString(response.title)}/${slugifyString(response.id)}`
            );
            setDisableSubmitBtn(false);
          } else {
            setDisableSubmitBtn(false);
            showSuccessToast(
              from == "create product idea"
                ? "Product idea updated successfully"
                : "Discussion updated successfully"
            );
            router.push(
              `/community/${data.communityLink}/${slugifyString(
                response?.category?.value || "All"
              )}/${slugifyString(response.title)}/${slugifyString(response.id)}`
            );
          }
        }
      } else {
        let uploadedFilesIds: Array<string> = [];
        let response = await addDiscussion({
          addDiscussionIdeaInput: {
            title: title,
            enable_idea_comments: true,
            content: DOMPurify.sanitize(editorRef.current.getHTML()),
            cmty_content_type: data.cmty_content_type,
            categoryId: category,
          },
        });
        if (response) {
          if (uploadedFiles?.length > 0) {
            const userData = {
              uploaded_by: decodeTokenData?.emailId || "",
              discussion_idea_id: response.discussion_idea_id,
              attachment_type: "Discussion_idea_uploads",
            };
            const multiUserData: any[] = uploadedFiles.map(() => userData);
            const fileResponse: any[] = await multipleFileUploadApi(
              uploadedFiles,
              multiUserData,
              accessTokenId
            );
            showSuccessToast(data.successToast);
            router.push(
              `/community/${data.communityLink}/${slugifyString(
                response?.category?.value || "All"
              )}/${slugifyString(response.title)}/${slugifyString(response.id)}`
            );
            setDisableSubmitBtn(false);
          } else {
            setDisableSubmitBtn(false);
            showSuccessToast(data.successToast);
            router.push(
              `/community/${data.communityLink}/${slugifyString(
                response?.category?.value || "All"
              )}/${slugifyString(response.title)}/${slugifyString(response.id)}`
            );
          }
        }
      }
    },
  });

  useEffect(() => {
    import("@lottiefiles/lottie-player");
  });

  useEffect(() => {
    categoryDropDownData({ masterType: data.masterType }).then((response) => {
      if (response?.length > 0) {
        const options = response.map((each: any) => ({
          label: each?.value,
          value: each?.id,
        }));
        setCategoryOptions(options);
      }
    });
    getTopData({
      listDiscussionIdeasInput: {
        perPage: 5,
        page: 1,
        cmtyContentType: data.cmty_content_type,
      },
    }).then((res) => setLatest(res?.discussionIdeas || []));
    categoryListAndCount({
      contentType: data.cmty_content_type,
    }).then((response) => {
      const modData = response.categories
        .filter((val: any) => val.per_category_count > 0)
        .map((val: any) => {
          return {
            value: val.master_value,
            id: val.master_id,
            count: val.per_category_count,
            slug: slugifyString(val.master_value),
          };
        });
      modData.unshift({
        value: "All",
        id: 1,
        count: response.total_count,
        slug: "",
      });
      setCategoryListAndCountData(modData);
    });
  }, [from]);

  useEffect(() => {
    if (edit) {
      const getDiscussionData = async () => {
        const discussionData = await getDiscussionIdeaById({
          getDiscussionIdeaId: params?.id,
        });
        formik.setValues({
          title: discussionData.title,
          category: discussionData?.category?.id || "",
          id: discussionData.id,
        });
        editorRef.current.setHTML(discussionData.content);
        setSelectCategoryData({
          label: discussionData?.category?.value,
          value: discussionData?.category?.id,
        });
        setUploadedFiles(discussionData?.discussion_idea_attachment || []);
        setOriginalUpload(discussionData?.discussion_idea_attachment || []);
        setInitialPatchedValues({
          form: {
            title: discussionData.title,
            category: discussionData?.category?.id || "",
            id: discussionData.id,
            content: discussionData.content,
          },
          attachment: discussionData?.discussion_idea_attachment || [],
        });
      };
      getDiscussionData();
    }
  }, []);

  return (
    <>
      <main>
        <div className="pt_titletop">
          <div className="container-fluid">
            <div className="pt_breadcrumbs">
              <Link href={AppRoutes.COMMUNITY} className="contrast">
                Community
              </Link>
              <i className="fa-light fa-chevron-right"></i>
              <Link
                href={
                  from == "start discussion"
                    ? AppRoutes.COMMUNITY_DISCUSSION
                    : AppRoutes.PRODUCT_IDEAS
                }
                className="contrast"
              >
                {from == "start discussion" ? "Discussions" : "Product ideas"}
              </Link>
              <i className="fa-light fa-chevron-right"></i>
              <span>{data.breadCrumbs}</span>
            </div>
          </div>
        </div>

        <div className="pt_blog">
          <div className="container-fluid">
            <div className="bloggrid">
              <div className="pt_blogleft">
                {categoryListAndCountData?.length > 0 && <h6>Categories</h6>}
                <ul>
                  {categoryListAndCountData?.map((val: any) => {
                    return (
                      <li key={val.id}>
                        {val.value == "All" ? (
                          <Link href={`/community/${data.communityLink}`}>
                            {val.value}
                            <span>{val.count}</span>
                          </Link>
                        ) : (
                          <Link
                            href={`/community/${
                              data.communityLink
                            }/${slugifyString(val.value)}`}
                          >
                            {val.value}
                            <span>{val.count}</span>
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {latest?.length > 0 && (
                  <>
                    <h6>Latest</h6>
                    {latest?.map((val: any) => {
                      return (
                        <ShowMoreLess
                          text={val.content}
                          title={val.title}
                          link={`/community/${
                            data.communityLink
                          }/${slugifyString(
                            val.category?.value
                          )}/${slugifyString(val?.title)}/${val.id}`}
                          key={val.id}
                        ></ShowMoreLess>
                      );
                    })}
                  </>
                )}

                <h6>Community</h6>
                {!data.hideStartDiscussion && (
                  <Link
                    href={AppRoutes.COMMUNITY_START_DISCUSSION}
                    className="pt_linksbox pt_sidelinksbox"
                  >
                    <lottie-player
                      autoplay
                      loop
                      mode="normal"
                      src="/json/rbicons/users.json"
                    ></lottie-player>
                    <h5>Start discussion</h5>
                    <p>
                      Ask questions and share your knowledge with other PayTrade
                      users
                    </p>
                  </Link>
                )}
                {!data.hideCreateProductIdea && (
                  <Link
                    href={AppRoutes.CREATE_PRODUCT_IDEAS}
                    className="pt_linksbox pt_sidelinksbox"
                  >
                    <lottie-player
                      autoplay
                      loop
                      mode="normal"
                      src="/json/rbicons/ideas.json"
                    ></lottie-player>
                    <h5>Create product idea</h5>
                    <p>
                      Suggest new products and features to be added to PayTrade
                    </p>
                  </Link>
                )}
              </div>

              <div className="pt_blogright">
                <div className="pt_bloginner">
                  <div className="container-fluid">
                    <h2>{edit ? data.editBreadCrumbs : data.breadCrumbs}</h2>
                    <form onSubmit={formik.handleSubmit}>
                      <div className="pt_addcommunity">
                        <label>
                          {data.fields[0].label}{" "}
                          <span className="required">*</span>
                        </label>
                        <FormikControl
                          control={InputType.TEXT_FIELD}
                          name={"title"}
                          placeholder={data.fields[0].placeholder}
                          error={formik.errors?.title}
                          showError={
                            formik.touched.title && formik.errors.title
                          }
                          onChange={(e: any) =>
                            formik?.setFieldValue("title", e?.target?.value)
                          }
                          onBlur={formik.handleBlur("title")}
                          value={formik.values?.title}
                        />
                        <br />
                        <br />
                        <label>
                          {data.fields[1].label}
                          {from == "start discussion" && (
                            <span className="required">*</span>
                          )}
                        </label>
                        <SearchableSelect
                          placeholder={data.fields[1].placeholder}
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
                          errorMessage={formik.errors?.category}
                          isRequired={
                            formik.errors?.category &&
                            formik.getFieldMeta("category").touched
                              ? true
                              : false
                          }
                        />
                        <br />
                        <br />
                        <label>
                          {data.fields[2].label}
                          {from == "start discussion" && (
                            <span className="required">*</span>
                          )}
                        </label>
                        <YsEditor ref={editorRef} />
                        <br />
                        <br />
                        <div>
                          <label>Upload attachment</label>
                          <MultipleFileHandler
                            titleName=""
                            filesToAccept={`${UploadImage.jpegAndPng.toString()},application/pdf,${
                              uploadFile.word
                            }`}
                            existingFiles={uploadedFiles}
                            afterFileChange={(modifiedFiles: any) =>
                              setUploadedFiles(modifiedFiles)
                            }
                            fileNameTruncateSize={37}
                          />
                        </div>
                        <div className="right">
                          <button
                            type="button"
                            className="commentbutton"
                            onClick={() => formik.handleSubmit()}
                            disabled={disableSubmitBtn}
                          >
                            <i className="fa-light fa-message-dots"></i>
                            {edit ? data.editSubmitButton : data.submitButton}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
