import ShowMoreLess from "@/components/MoreLessCard";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { slugifyString } from "@/utils";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import {
  addComments,
  categoryListAndCount,
  deleteComments,
  deleteTopic,
  getDiscussionIdeaById,
  getTopData,
  getTopicComments,
  reportCommentAndDiscussionAndReport,
  updateComments,
  updateViewCount,
} from "../Community/community.functions";
import { topicPageDate } from "./topic.constant";
import { useAppDispatch } from "@/redux/store";
import { useTokenDetails } from "@/hooks";
import { setBlogDetailsForRouting } from "@/redux/slices/dashboardSlices";
import BreadCrumbs from "@/components/BreadCrumbs";
import { DISCUSSION_COMMENTS, GET_DISCUSSION_DETAILS_ID } from "./topic.type";
import { format } from "date-fns";
import DOMPurify from "dompurify";
import YsEditor from "@/components/ysEditor";
import Image from "next/image";
import userImage from "../../../../public/images/avatar.png";
import pdfIcon from "../../../../public/images/pdf-icon.png";
import docIcon from "../../../../public/images/docx-icon.png";

import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "@/components/Toaster";
import BlogPagination from "@/components/BlogPagination";
import MultipleFileHandler from "@/components/MultipleFileHandler";
import { uploadFile, UploadImage } from "@/shared/constant/general";
import { deleteAttachment, multipleFileUploadApi } from "@/app/api/commonApi";
import BaseModal from "@/components/BaseModal";
import { isEqual } from "lodash";

export default function Topic() {
  const params = useParams();
  const pageData =
    topicPageDate[params?.discussion as keyof typeof topicPageDate];
  const [categoryListAndCountData, setCategoryListAndCountData] = useState([]);
  const [latest, setLatest] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [disableCommentsBtn, setDisableCommentsBtn] = useState(false);
  const [openReport, setOpenReport] = useState(false);
  const [openDeleteTopicConfirmation, setOpenDeleteTopicConfirmation] =
    useState(false);

  // report
  const [selectedOption, setSelectedOption] = useState("Inappropriate");
  const [reportMessage, setReportMessage] = useState("");
  const [disableReportBtn, setDisableReportBtn] = useState(false);

  //
  const [currentData, setCurrentData] = useState<any>();

  const [discussionData, setDiscussionData] =
    useState<GET_DISCUSSION_DETAILS_ID>();
  const editorRef = useRef<any>(null);
  const commentUpdateRef = useRef<any>(null);

  const [totalRecords, setTotalRecords] = useState<any>(0);
  const [comments, setComments] = useState<DISCUSSION_COMMENTS>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [editCommentIndex, setEditCommentIndex] = useState<null | number>(null);
  const [updateCommentData, setUpdateCommentData] = useState<any>();

  const [openDeleteConfirmation, setOpenDeleteConfirmation] = useState(false);

  const dispatch = useAppDispatch();
  const router = useRouter();
  const { accessTokenId, decodeTokenData }: any = useTokenDetails();
  const cardsRef = useRef<NodeListOf<Element> | null>(null);

  useEffect(() => {
    import("@lottiefiles/lottie-player");
  });

  useEffect(() => {
    const categoryList = async () => {
      const response = await categoryListAndCount({
        contentType: pageData.cmtyContentType,
      });
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
    };
    categoryList();
    getTopData({
      listDiscussionIdeasInput: {
        perPage: 5,
        page: 1,
        cmtyContentType: pageData.cmtyContentType,
      },
    }).then((res) => setLatest(res?.discussionIdeas || []));
    getDiscussionIdeaByIdData();
    updateViewCount({
      viewCountUpdateDiscussionIdeaId: params?.topic?.[1],
    });
  }, []);

  function getDiscussionIdeaByIdData() {
    getDiscussionIdeaById({
      getDiscussionIdeaId: params?.topic?.[1],
    }).then((res) => {
      res.vote_count = res.vote_count ? res.vote_count : 0;
      res.like_count = res.like_count ? res.like_count : 0;
      setDiscussionData(res || []);
      setDisableReportBtn(false);
    });
  }

  function getComments() {
    getTopicComments({
      listAnsCmtInput: {
        perPage: 4,
        page: currentPage,
        id: discussionData?.discussion_idea_id,
        best_ans: false,
      },
    }).then((response) => {
      setComments(response?.comment);
      setTotalRecords(response.total_count);
      setDisableReportBtn(false);
    });
  }

  useEffect(() => {
    if (discussionData?.discussion_idea_id) {
      getComments();
    }
  }, [discussionData?.discussion_idea_id, currentPage]);

  const navToLoginPageDiscussionAndProductIdea = (
    from: "discussion" | "productIdea" | "currentPage"
  ) => {
    const routes: Record<string, string> = {
      discussion: AppRoutes.COMMUNITY_START_DISCUSSION,
      productIdea: AppRoutes.CREATE_PRODUCT_IDEAS,
      currentPage: `/community/${pageData.pageLink}/${slugifyString(
        discussionData?.category?.value || "All"
      )}/${slugifyString(discussionData?.title || "")}/${discussionData?.id}`,
    };

    const targetRoute = routes[from];
    if (!targetRoute) return;

    if (decodeTokenData) {
      return router.push(targetRoute);
    }

    dispatch(setBlogDetailsForRouting({ url: targetRoute }));
    return router.push(AppRoutes.USER_LOGIN);
  };

  async function handleAddComments() {
    if (editorRef.current.getText()?.length === 0) {
      showErrorToast("Comment is required");
    } else {
      try {
        setDisableCommentsBtn(true);
        const response = await addComments({
          addAnswerCommentInput: {
            discussion_idea_id: discussionData?.discussion_idea_id,
            answer_comment: DOMPurify.sanitize(editorRef.current.getHTML()),
          },
        });
        if (response) {
          if (uploadedFiles?.length > 0) {
            const userData = {
              uploaded_by: decodeTokenData?.emailId || "",
              discussion_idea_id: discussionData?.discussion_idea_id,
              attachment_type: "Answer_comment_uploads",
              answer_comment_id: response.answer_comment_id,
            };
            const multiUserData: any[] = uploadedFiles.map(() => userData);
            const fileResponse: any[] = await multipleFileUploadApi(
              uploadedFiles,
              multiUserData,
              accessTokenId
            );
            setUploadedFiles([]);
          }
          getComments();
          getDiscussionIdeaByIdData();
          showSuccessToast("Comment added successfully");
          editorRef.current?.setHTML("");
          setDisableCommentsBtn(false);
        }
      } catch (e) {
        setDisableCommentsBtn(false);
      }
    }
  }

  async function handleUpdateComments() {
    if (
      editCommentIndex &&
      comments[editCommentIndex].answer_comment ==
        commentUpdateRef.current.getHTML() &&
      isEqual(
        updateCommentData.answer_comment_attachment,
        comments[editCommentIndex]?.answer_comment_attachment
      )
    ) {
      showInfoToast("No changes to update");

      return;
    }
    if (commentUpdateRef.current.getText()?.length === 0) {
      showErrorToast("Comment is required");
    } else {
      try {
        setDisableCommentsBtn(true);
        const response = await updateComments({
          updateAnswerCommentInput: {
            answer_comment_id: updateCommentData?.answer_comment_id,
            answer_comment: DOMPurify.sanitize(
              commentUpdateRef.current.getHTML()
            ),
          },
        });
        if (response) {
          if (
            updateCommentData?.answer_comment_attachment?.length > 0 ||
            (editCommentIndex !== null &&
              editCommentIndex >= 0 &&
              comments[editCommentIndex]?.answer_comment_attachment?.length > 0)
          ) {
            const userData = {
              uploaded_by: decodeTokenData?.emailId || "",
              discussion_idea_id: discussionData?.discussion_idea_id,
              attachment_type: "Answer_comment_uploads",
              answer_comment_id: updateCommentData.answer_comment_id,
            };
            const multiUserData: any[] =
              updateCommentData?.answer_comment_attachment
                .filter((val: any) => !val.file_path)
                .map(() => userData);
            if (multiUserData?.length > 0) {
              const fileResponse: any[] = await multipleFileUploadApi(
                updateCommentData?.answer_comment_attachment.filter(
                  (val: any) => !val.file_path
                ),
                multiUserData,
                accessTokenId
              );
            }
            if (editCommentIndex !== null && editCommentIndex >= 0) {
              const listOfDeletedAttachment = comments[
                editCommentIndex
              ]?.answer_comment_attachment?.filter((val: any) => {
                return !updateCommentData?.answer_comment_attachment
                  .filter((val: any) => val.file_path)
                  .some(
                    (existing: any) => existing.file_path === val.file_path
                  );
              });
              if (listOfDeletedAttachment?.length > 0) {
                listOfDeletedAttachment.forEach(async (val) => {
                  const postData = {
                    attachmentId: val?.id,
                    attachmentType: "Answer_comment_uploads",
                    id: comments[editCommentIndex].id,
                  };
                  const success = await deleteAttachment(postData);
                });
              }
            }
          }

          getComments();
          getDiscussionIdeaByIdData();

          showSuccessToast("Comment updated successfully");
          commentUpdateRef.current?.setHTML("");
          setUpdateCommentData(null);
          setEditCommentIndex(null);
          setDisableCommentsBtn(false);
        }
      } catch (e) {
        setDisableCommentsBtn(false);
      }
    }
  }

  async function handleMostLikedCommentsUpdate() {
    if (
      discussionData?.answerComment[0]?.answer_comment ==
        commentUpdateRef.current.getHTML() &&
      isEqual(
        updateCommentData.answer_comment_attachment,
        discussionData?.answerComment[0]?.answer_comment_attachment
      )
    ) {
      showInfoToast("No changes to update");

      return;
    }
    if (commentUpdateRef.current.getText()?.length === 0) {
      showErrorToast("Comment is required");
    } else {
      try {
        setDisableCommentsBtn(true);
        const response = await updateComments({
          updateAnswerCommentInput: {
            answer_comment_id: updateCommentData?.answer_comment_id,
            answer_comment: DOMPurify.sanitize(
              commentUpdateRef.current.getHTML()
            ),
          },
        });
        if (response) {
          if (
            updateCommentData?.answer_comment_attachment?.length > 0 ||
            (discussionData?.answerComment &&
              discussionData?.answerComment[0]?.answer_comment_attachment
                ?.length > 0)
          ) {
            const userData = {
              uploaded_by: decodeTokenData?.emailId || "",
              discussion_idea_id: discussionData?.discussion_idea_id,
              attachment_type: "Answer_comment_uploads",
              answer_comment_id: updateCommentData.answer_comment_id,
            };
            const multiUserData: any[] =
              updateCommentData?.answer_comment_attachment
                .filter((val: any) => !val.file_path)
                .map(() => userData);
            if (multiUserData?.length > 0) {
              const fileResponse: any[] = await multipleFileUploadApi(
                updateCommentData?.answer_comment_attachment.filter(
                  (val: any) => !val.file_path
                ),
                multiUserData,
                accessTokenId
              );
            }
            const listOfDeletedAttachment =
              discussionData?.answerComment[0].answer_comment_attachment?.filter(
                (val: any) => {
                  return !updateCommentData?.answer_comment_attachment
                    .filter((val: any) => val.file_path)
                    .some(
                      (existing: any) => existing.file_path === val.file_path
                    );
                }
              );
            if (
              listOfDeletedAttachment &&
              listOfDeletedAttachment?.length > 0
            ) {
              listOfDeletedAttachment.forEach(async (val) => {
                const postData = {
                  attachmentId: val?.id,
                  attachmentType: "Answer_comment_uploads",
                  id: discussionData?.answerComment[0].id,
                };
                const success = await deleteAttachment(postData);
              });
            }
          }

          getDiscussionIdeaByIdData();
          showSuccessToast("Comment updated successfully");
          commentUpdateRef.current?.setHTML("");
          setUpdateCommentData(null);
          setEditCommentIndex(null);
          setDisableCommentsBtn(false);
        }
      } catch (e) {
        setDisableCommentsBtn(false);
      }
    }
  }

  async function handleDeleteComments() {
    const response = await deleteComments({
      updateAnswerCommentInput: {
        answer_comment_id: updateCommentData.answer_comment_id,
        answer_comment_status: "Deleted",
        answer_comment: null,
      },
    });
    if (response) {
      getComments();
      getDiscussionIdeaByIdData();
      showSuccessToast("Comment deleted successfully");
    }
  }

  function toggleModal(data: any): void {
    setCurrentData(data);
    setOpenReport(true);
  }

  async function handleReportSubmission({
    answer_comment_id = null,
    discussion_idea_id = null,
    flag_reason = null,
    cmty_flag_type,
    reaction_type,
  }: {
    answer_comment_id: number | null;
    discussion_idea_id: number | null;
    flag_reason: string | null;
    cmty_flag_type: "Inappropriate" | "Spam" | null;
    reaction_type: "Vote" | "Like" | "Flag" | "None";
  }) {
    setDisableReportBtn(true);
    const response = await reportCommentAndDiscussionAndReport({
      voteLikeFlagInput: {
        answer_comment_id,
        discussion_idea_id,
        flag_reason,
        cmty_flag_type,
        reaction_type,
      },
    });
    if (response) {
      if (reaction_type == "Flag") {
        showSuccessToast(
          "Thanks for reporting! Our team will look into it as soon as possible."
        );
        setSelectedOption("Inappropriate");
        setReportMessage("");
        getDiscussionIdeaByIdData();
        getComments();
      } else {
        setDisableReportBtn(false);
      }
    }
  }

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith(".pdf")) return pdfIcon;
    if (fileName.endsWith(".docx")) return docIcon;
    return fileName;
  };

  const showFileName = (fileName: string) => {
    if (fileName.endsWith(".pdf")) return fileName;
    if (fileName.endsWith(".docx")) return fileName;
    return undefined;
  };

  useEffect(() => {
    const handleMouseMove = (ev: MouseEvent) => {
      const all = cardsRef.current;
      if (all) {
        all.forEach((e) => {
          const blob = e.querySelector(".blob") as HTMLElement;
          const fblob = e.querySelector(".fakeblob") as HTMLElement;

          if (blob && fblob) {
            const rec = fblob.getBoundingClientRect();
            blob.style.opacity = "1";

            blob.animate(
              [
                {
                  transform: `translate(${
                    ev.clientX - rec.left - rec.width / 2
                  }px, ${ev.clientY - rec.top - rec.height / 2}px)`,
                },
              ],
              {
                duration: 300,
                fill: "forwards",
              }
            );
          }
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const handleDeleteTopic = async () => {
    const response = await deleteTopic({
      updateContentInput: {
        id: params?.topic?.[1],
        discussion_idea_status: "Deleted",
      },
    });
    if (response) {
      showSuccessToast(
        (response.cmty_content_type == "Discussion"
          ? "Discussion deleted successfully"
          : "Product idea deleted successfully") + ""
      );
      router.push(
        `/community/` +
          (response.cmty_content_type == "Discussion"
            ? "discussions/"
            : "product-ideas/") +
          slugifyString(response?.category?.value || "All")
      );
    }
  };

  return (
    <main>
      <div className="pt_titletop">
        <div className="container-fluid">
          <div className="pt_breadcrumbs">
            <BreadCrumbs
              routePaths={[
                {
                  name: "Community",
                  path: AppRoutes.COMMUNITY,
                },
                {
                  name: pageData?.pageName,
                  path: AppRoutes.COMMUNITY + "/" + pageData?.pageLink,
                },
                {
                  name: discussionData?.category?.value || "All",
                  path:
                    AppRoutes.COMMUNITY +
                    "/" +
                    pageData?.pageLink +
                    "/" +
                    slugifyString(discussionData?.category?.value || "All"),
                },
              ]}
              activeRoute={discussionData?.title || ""}
            />
          </div>
        </div>
      </div>
      <div className="pt_blog">
        <div className="container-fluid">
          <div className="bloggrid discussiongrid">
            <div className="pt_blogleft">
              {categoryListAndCountData?.length > 0 && <h6>Categories</h6>}
              <ul>
                {categoryListAndCountData?.map((val: any) => {
                  return (
                    <li key={val.id}>
                      {val.value == "All" ? (
                        <Link href={`/community/${pageData.pageLink}`}>
                          {val.value}
                          <span>{val.count}</span>
                        </Link>
                      ) : (
                        <Link
                          href={`/community/${
                            pageData.pageLink
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
                        key={val.id}
                        text={val.content}
                        title={val.title}
                        link={`/community/${pageData.pageLink}/${slugifyString(
                          val.category?.value || "All"
                        )}/${slugifyString(val?.title)}/${val.id}`}
                      ></ShowMoreLess>
                    );
                  })}
                </>
              )}
              <h6>Community</h6>
              <a
                onClick={() =>
                  navToLoginPageDiscussionAndProductIdea("discussion")
                }
                className="pt_linksbox pt_sidelinksbox cu-pointer"
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
              </a>
              <Link
                href={"/community/product-ideas"}
                className="pt_linksbox pt_sidelinksbox"
              >
                <lottie-player
                  autoplay
                  loop
                  mode="normal"
                  src="/json/rbicons/ideas.json"
                ></lottie-player>
                <h5>View product ideas</h5>
                <p>Suggest new products and features to be added to PayTrade</p>
              </Link>
            </div>
            {discussionData && (
              <div className="pt_blogright">
                <div className="pt_bloginner">
                  <div className="container-fluid">
                    <h6>{discussionData?.category?.value}</h6>
                    <h3>{discussionData?.title}</h3>
                    <div className="commentcontent">
                      <div className="commenter">
                        <Image
                          src={
                            discussionData?.admin_author?.author_image_base64 ||
                            discussionData?.author?.author_image_base64 ||
                            userImage
                          }
                          alt={
                            discussionData?.admin_author
                              ? discussionData?.admin_author?.first_name +
                                " " +
                                discussionData?.admin_author?.last_name
                              : discussionData?.author?.first_name +
                                " " +
                                discussionData?.author?.last_name
                          }
                          width={0}
                          height={0}
                          className="commentavatar"
                        />
                        <div className="commenterinfo">
                          <h5>
                            {discussionData?.admin_author
                              ? discussionData?.admin_author?.first_name +
                                " " +
                                discussionData?.admin_author?.last_name
                              : discussionData?.author?.first_name +
                                " " +
                                discussionData?.author?.last_name}
                            &nbsp; &nbsp;
                            {discussionData?.admin_author?.first_name && (
                              <>
                                <Image
                                  src="/apple-touch-icon.png"
                                  alt={"Paytrade"}
                                  width={20}
                                  height={20}
                                  style={{
                                    borderRadius: "50%",
                                    marginBottom: "3px",
                                  }}
                                />
                                <span
                                  style={{
                                    color: "#e84438",
                                    marginLeft: "5px",
                                  }}
                                >
                                  paytrade
                                </span>
                              </>
                            )}
                          </h5>
                          <p>
                            {discussionData?.created_on &&
                              format(
                                discussionData?.created_on,
                                "dd-MM-yyyy hh:mma"
                              )}
                          </p>
                        </div>
                      </div>
                      <div className="commentcontent">
                        <div className="commentflex">
                          <div className="votebutton">
                            <div className="votecount">
                              {discussionData?.cmty_content_type ==
                              "Discussion" ? (
                                <>
                                  <i className="fa-light fa-thumbs-up"></i>
                                  {discussionData?.like_count || 0}
                                </>
                              ) : (
                                <>
                                  <i className="fa-light fa-arrow-up-from-arc"></i>
                                  {discussionData?.vote_count || 0}
                                </>
                              )}
                            </div>
                            <button
                              disabled={
                                discussionData.your_disc_idea_response == "Flag"
                              }
                              className={`commentbutton smallbutton contrast   ${
                                discussionData.your_disc_idea_response ==
                                  "Like" ||
                                discussionData.your_disc_idea_response == "Vote"
                                  ? "voted"
                                  : "vote"
                              }`}
                              onClick={() => {
                                if (!decodeTokenData)
                                  return navToLoginPageDiscussionAndProductIdea(
                                    "currentPage"
                                  );

                                handleReportSubmission({
                                  discussion_idea_id:
                                    discussionData.discussion_idea_id,
                                  answer_comment_id: null,
                                  flag_reason: null,
                                  cmty_flag_type: null,
                                  reaction_type:
                                    discussionData.your_disc_idea_response ==
                                      "Like" ||
                                    discussionData.your_disc_idea_response ==
                                      "Vote"
                                      ? "None"
                                      : discussionData?.cmty_content_type ==
                                        "Discussion"
                                      ? "Like"
                                      : "Vote",
                                });

                                setDiscussionData((prev) => {
                                  if (!prev) return prev;

                                  return {
                                    ...prev,
                                    like_count:
                                      prev.cmty_content_type === "Discussion"
                                        ? prev.your_disc_idea_response ===
                                            "Like" && prev.like_count > 0
                                          ? prev.like_count - 1
                                          : prev.like_count + 1
                                        : 0,
                                    vote_count:
                                      prev.cmty_content_type !== "Discussion"
                                        ? prev.your_disc_idea_response ===
                                            "Vote" && prev.vote_count > 0
                                          ? prev.vote_count - 1
                                          : prev.vote_count + 1
                                        : 0,
                                    your_disc_idea_response: (() => {
                                      if (
                                        prev.your_disc_idea_response ===
                                          "Like" ||
                                        prev.your_disc_idea_response === "Vote"
                                      ) {
                                        return "None";
                                      }
                                      if (
                                        !prev.your_disc_idea_response ||
                                        prev.your_disc_idea_response === "None"
                                      ) {
                                        return prev.cmty_content_type ===
                                          "Discussion"
                                          ? "Like"
                                          : "Vote";
                                      }
                                      return prev.your_disc_idea_response;
                                    })(),
                                  };
                                });
                              }}
                              data-tooltip={
                                !decodeTokenData
                                  ? discussionData?.cmty_content_type ===
                                    "Discussion"
                                    ? "Login to like"
                                    : "Login to upvote"
                                  : undefined
                              }
                            >
                              {discussionData?.cmty_content_type == "Discussion"
                                ? "like"
                                : "upvote"}
                            </button>
                          </div>
                          <p
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(
                                discussionData?.content || ""
                              ),
                            }}
                          ></p>
                        </div>
                        {discussionData?.discussion_idea_attachment?.map(
                          (val) => {
                            return (
                              <div
                                className="pt_topicattachment"
                                key={val.file_path}
                                style={{ textAlign: "center" }}
                              >
                                <a
                                  onClick={() =>
                                    window.open(val.file_path, "_blank")
                                  }
                                  data-tooltip={showFileName(val.file_name)}
                                  data-placement="bottom"
                                  className="cu-pointer"
                                >
                                  <Image
                                    src={getFileIcon(val.file_path)}
                                    alt={val.file_name}
                                    width={75}
                                    height={75}
                                    style={{
                                      width: "75px",
                                      height: "75px",
                                      objectFit: "contain",
                                    }}
                                  />
                                </a>
                              </div>
                            );
                          }
                        )}
                      </div>
                      <div className="pt_discussfooter">
                        <div>
                          {decodeTokenData &&
                            discussionData.your_disc_idea_response !=
                              "Flag" && (
                              <button
                                className="commentbutton smallbutton subtle"
                                onClick={() => toggleModal(discussionData)}
                                disabled={disableReportBtn}
                              >
                                <i className="fa-light fa-flag"></i>
                                Report
                              </button>
                            )}
                          {discussionData.your_disc_idea_response == "Flag" &&
                            decodeTokenData && (
                              <button
                                style={{
                                  background: "#FFD580",
                                  border: "1px solid #FFD580",
                                  cursor: "default",
                                }}
                                className="commentbutton smallbutton subtle"
                              >
                                <i className="fa-light fa-flag"></i>
                                Reported
                              </button>
                            )}
                        </div>
                        <div className="pt_topicbuttons">
                          {discussionData?.editable && (
                            <>
                              <Link
                                href={
                                  "/community/" +
                                  (params?.discussion == "discussions"
                                    ? "edit-discussion/"
                                    : "edit-product-idea/") +
                                  discussionData?.id
                                }
                              >
                                <h6 className="cu-pointer">
                                  <i className="fa-light fa-edit"></i> Edit
                                </h6>
                              </Link>
                              <h6
                                className="cu-pointer"
                                onClick={() => {
                                  setOpenDeleteTopicConfirmation(true);
                                }}
                              >
                                <i className="fa-light fa-trash"></i> Delete
                              </h6>
                            </>
                          )}
                          <h6>
                            <i className="fa-light fa-eye"></i>{" "}
                            {discussionData?.view_count || 0}{" "}
                            {!discussionData?.view_count
                              ? "View"
                              : discussionData?.view_count > 1
                              ? "Views"
                              : "View"}
                          </h6>
                          <h6>
                            <i className="fa-light fa-comments"></i>{" "}
                            {discussionData?.answer_comment_count || 0}{" "}
                            {!discussionData?.answer_comment_count
                              ? "Comment"
                              : discussionData?.answer_comment_count > 1
                              ? "Comments"
                              : "Comment"}
                          </h6>
                        </div>
                      </div>
                    </div>
                    {decodeTokenData ? (
                      <div className="pt_newcomment">
                        <h4>Post a reply</h4>
                        <YsEditor ref={editorRef} />
                        <br />

                        <div>
                          <div>
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
                              disabled={disableCommentsBtn}
                              className="commentbutton secondary"
                              onClick={() => handleAddComments()}
                            >
                              <i className="fa-light fa-comment-plus"></i>Post
                              reply
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="pt_newcomment">
                        <div className="pt_discussfooter">
                          <div></div>
                          <button
                            className="commentbutton secondary"
                            onClick={() =>
                              navToLoginPageDiscussionAndProductIdea(
                                "currentPage"
                              )
                            }
                          >
                            <i className="fa-light fa-comment-plus"></i>login to
                            reply
                          </button>
                        </div>
                      </div>
                    )}
                    {discussionData.answerComment?.length > 0 &&
                      currentPage == 1 && (
                        <div className="pt_comments pt_bestcomment">
                          <h4 className="crabtext">
                            <i className="fa-light fa-thumbs-up"></i>
                            &nbsp;&nbsp;Most liked reply
                          </h4>
                          <div
                            className="pt_glow"
                            ref={(el: any) =>
                              (cardsRef.current = el?.querySelectorAll(".card"))
                            }
                          >
                            <div className="card">
                              <div className="inner">
                                <div className="comment">
                                  <div className="commenter">
                                    <Image
                                      src={
                                        discussionData.answerComment[0]
                                          .answer_comment_owner_image_base64 ||
                                        userImage
                                      }
                                      className="commentavatar"
                                      alt={
                                        discussionData.answerComment[0]
                                          .answer_comment_owner_name
                                      }
                                      width={0}
                                      height={0}
                                    />
                                    <div className="commenterinfo">
                                      <h5>
                                        {
                                          discussionData.answerComment[0]
                                            .answer_comment_owner_name
                                        }
                                        &nbsp; &nbsp;
                                        {discussionData.answerComment[0]
                                          .answer_comment_by == "admin" && (
                                          <>
                                            <Image
                                              src="/apple-touch-icon.png"
                                              alt={"Paytrade"}
                                              width={20}
                                              height={20}
                                              style={{
                                                borderRadius: "50%",
                                                marginBottom: "3px",
                                              }}
                                            />
                                            <span
                                              style={{
                                                color: "#e84438",
                                                marginLeft: "5px",
                                              }}
                                            >
                                              paytrade
                                            </span>
                                          </>
                                        )}
                                      </h5>
                                      <p>
                                        {format(
                                          discussionData.answerComment[0]
                                            ?.created_on,
                                          "dd-MM-yyyy hh:mma"
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="commentcontent">
                                    <div className="commentflex">
                                      <div className="votebutton">
                                        <div className="votecount">
                                          <i className="fa-light fa-thumbs-up"></i>
                                          {discussionData.answerComment[0]
                                            ?.like_count || 0}
                                        </div>
                                        <button
                                          disabled={
                                            discussionData.answerComment[0]
                                              .your_response == "Flag"
                                          }
                                          className={`commentbutton smallbutton contrast   ${
                                            discussionData.answerComment[0]
                                              .your_response == "Like"
                                              ? "voted"
                                              : "vote"
                                          }`}
                                          data-tooltip={
                                            !decodeTokenData
                                              ? " Login to like"
                                              : undefined
                                          }
                                          onClick={() => {
                                            if (!decodeTokenData)
                                              return navToLoginPageDiscussionAndProductIdea(
                                                "currentPage"
                                              );
                                            handleReportSubmission({
                                              discussion_idea_id: null,
                                              answer_comment_id:
                                                discussionData.answerComment[0]
                                                  .answer_comment_id,
                                              flag_reason: null,
                                              cmty_flag_type: null,
                                              reaction_type:
                                                discussionData.answerComment[0]
                                                  .your_response == "Like"
                                                  ? "None"
                                                  : "Like",
                                            });

                                            setDiscussionData((prev) => {
                                              if (!prev) return prev;
                                              return {
                                                ...prev,
                                                answerComment:
                                                  prev.answerComment?.map(
                                                    (comment, index) =>
                                                      index === 0
                                                        ? {
                                                            ...comment,
                                                            like_count:
                                                              comment.your_response ===
                                                                "Vote" ||
                                                              comment.your_response ===
                                                                "Like"
                                                                ? (comment.like_count ??
                                                                    0) - 1
                                                                : (comment.like_count ??
                                                                    0) + 1,
                                                            your_response:
                                                              comment.your_response ===
                                                              "Like"
                                                                ? "None"
                                                                : "Like",
                                                          }
                                                        : comment
                                                  ),
                                              };
                                            });
                                          }}
                                        >
                                          Like
                                        </button>
                                      </div>
                                      <p
                                        dangerouslySetInnerHTML={{
                                          __html: DOMPurify.sanitize(
                                            discussionData.answerComment[0]
                                              .answer_comment
                                          ),
                                        }}
                                      ></p>
                                    </div>
                                    {discussionData.answerComment[0]?.answer_comment_attachment?.map(
                                      (file) => {
                                        return (
                                          <div
                                            className="pt_topicattachment"
                                            key={file.file_path}
                                            style={{ textAlign: "center" }}
                                          >
                                            <a
                                              onClick={() =>
                                                window.open(
                                                  file.file_path,
                                                  "_blank"
                                                )
                                              }
                                              data-tooltip={showFileName(
                                                file.file_name
                                              )}
                                              data-placement="bottom"
                                              className="cu-pointer"
                                            >
                                              <Image
                                                src={getFileIcon(
                                                  file.file_path
                                                )}
                                                alt={file.file_name}
                                                width={30}
                                                height={30}
                                                style={{
                                                  width: "30px",
                                                  height: "30px",
                                                  objectFit: "contain",
                                                }}
                                              />
                                            </a>
                                          </div>
                                        );
                                      }
                                    )}
                                    <div className="right">
                                      {discussionData.answerComment[0]
                                        .comment_editable && (
                                        <>
                                          <button
                                            onClick={() => {
                                              setEditCommentIndex(-1);
                                              setUpdateCommentData(
                                                discussionData.answerComment[0]
                                              );
                                              setTimeout(() => {
                                                commentUpdateRef.current.setHTML(
                                                  discussionData
                                                    .answerComment[0]
                                                    .answer_comment
                                                );
                                              }, 500);
                                            }}
                                            className="commentbutton smallbutton subtle"
                                            style={{ marginRight: "5px" }}
                                          >
                                            <i className="fa-light fa-edit"></i>
                                            Edit
                                          </button>
                                          <button
                                            className="commentbutton smallbutton subtle"
                                            style={{ marginRight: "5px" }}
                                            onClick={() => {
                                              setOpenDeleteConfirmation(true);
                                              setUpdateCommentData(
                                                discussionData.answerComment[0]
                                              );
                                            }}
                                          >
                                            <i className="fa-light fa-trash"></i>
                                            Delete
                                          </button>
                                        </>
                                      )}
                                      {discussionData.answerComment[0]
                                        .your_response != "Flag" &&
                                        decodeTokenData && (
                                          <button
                                            className="commentbutton smallbutton subtle"
                                            onClick={() =>
                                              toggleModal(
                                                discussionData.answerComment[0]
                                              )
                                            }
                                            disabled={disableReportBtn}
                                          >
                                            <i className="fa-light fa-flag"></i>
                                            Report
                                          </button>
                                        )}
                                      {discussionData.answerComment[0]
                                        .your_response == "Flag" &&
                                        decodeTokenData && (
                                          <button
                                            style={{
                                              background: "#FFD580",
                                              border: "1px solid #FFD580",
                                              cursor: "default",
                                            }}
                                            className="commentbutton smallbutton subtle"
                                          >
                                            <i className="fa-light fa-flag"></i>
                                            Reported
                                          </button>
                                        )}
                                    </div>
                                    {editCommentIndex == -1 && (
                                      <div className="pt_newcomment">
                                        <h4>Post a reply</h4>
                                        <YsEditor
                                          id={
                                            discussionData.answerComment[0]
                                              .answer_comment_owner_name +
                                            discussionData.answerComment[0]
                                              .answer_comment_id
                                          }
                                          ref={commentUpdateRef}
                                        />
                                        <br />

                                        <div>
                                          <div>
                                            <MultipleFileHandler
                                              titleName=""
                                              filesToAccept={`${UploadImage.jpegAndPng.toString()},application/pdf,${
                                                uploadFile.word
                                              }`}
                                              existingFiles={
                                                updateCommentData?.answer_comment_attachment
                                              }
                                              afterFileChange={(
                                                modifiedFiles: any
                                              ) => {
                                                setUpdateCommentData(
                                                  (prevData: any) => ({
                                                    ...prevData,
                                                    answer_comment_attachment:
                                                      modifiedFiles,
                                                  })
                                                );
                                              }}
                                              fileNameTruncateSize={37}
                                            />
                                          </div>
                                          <div className="right">
                                            <button
                                              disabled={disableCommentsBtn}
                                              className="commentbutton secondary"
                                              onClick={() =>
                                                handleMostLikedCommentsUpdate()
                                              }
                                            >
                                              <i className="fa-light fa-comment-plus"></i>
                                              Update reply
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="blob"></div>
                              <div className="fakeblob"></div>
                            </div>
                          </div>
                        </div>
                      )}
                    <div className="pt_comments pt_bestcomment">
                      {comments?.map((val, targetIndex) => (
                        <>
                          <div className="card" key={val.answer_comment_id}>
                            <div className="inner">
                              <div className="comment">
                                <div className="commenter">
                                  <Image
                                    src={
                                      val.answer_comment_owner_image_base64 ||
                                      userImage
                                    }
                                    className="commentavatar"
                                    alt={val.answer_comment_owner_name}
                                    width={0}
                                    height={0}
                                  />
                                  <div className="commenterinfo">
                                    <h5>
                                      {val.answer_comment_owner_name} &nbsp;
                                      &nbsp;
                                      {val.answer_comment_by == "admin" && (
                                        <>
                                          <Image
                                            src="/apple-touch-icon.png"
                                            alt={"Paytrade"}
                                            width={20}
                                            height={20}
                                            style={{
                                              borderRadius: "50%",
                                              marginBottom: "3px",
                                            }}
                                          />
                                          <span
                                            style={{
                                              color: "#e84438",
                                              marginLeft: "5px",
                                            }}
                                          >
                                            paytrade
                                          </span>
                                        </>
                                      )}
                                    </h5>
                                    <p>
                                      {format(
                                        val?.created_on,
                                        "dd-MM-yyyy hh:mma"
                                      )}
                                    </p>
                                  </div>
                                </div>
                                {editCommentIndex != targetIndex && (
                                  <div className="commentcontent">
                                    <div className="commentflex">
                                      <div className="votebutton">
                                        <div className="votecount">
                                          <i className="fa-light fa-thumbs-up"></i>
                                          {val?.like_count || 0}
                                        </div>
                                        <button
                                          disabled={val.your_response == "Flag"}
                                          className={`commentbutton smallbutton contrast   ${
                                            val.your_response == "Like"
                                              ? "voted"
                                              : "vote"
                                          }`}
                                          data-tooltip={
                                            !decodeTokenData
                                              ? " Login to like"
                                              : undefined
                                          }
                                          onClick={() => {
                                            if (!decodeTokenData)
                                              return navToLoginPageDiscussionAndProductIdea(
                                                "currentPage"
                                              );
                                            handleReportSubmission({
                                              discussion_idea_id: null,
                                              answer_comment_id:
                                                val.answer_comment_id,
                                              flag_reason: null,
                                              cmty_flag_type: null,
                                              reaction_type:
                                                val.your_response == "Like"
                                                  ? "None"
                                                  : "Like",
                                            });

                                            setComments((prev) => {
                                              if (!prev) return prev;

                                              return prev.map(
                                                (comment, index) =>
                                                  index === targetIndex
                                                    ? {
                                                        ...comment,
                                                        like_count:
                                                          comment.your_response ==
                                                            "Vote" ||
                                                          comment.your_response ==
                                                            "Like"
                                                            ? comment.like_count -
                                                              1
                                                            : (comment.like_count ??
                                                                0) + 1,
                                                        your_response:
                                                          comment.your_response ==
                                                          "Like"
                                                            ? "None"
                                                            : "Like",
                                                      }
                                                    : comment
                                              );
                                            });
                                          }}
                                        >
                                          Like
                                        </button>
                                      </div>
                                      <p
                                        dangerouslySetInnerHTML={{
                                          __html: DOMPurify.sanitize(
                                            val.answer_comment
                                          ),
                                        }}
                                      ></p>
                                    </div>
                                    {val?.answer_comment_attachment?.map(
                                      (file) => {
                                        return (
                                          <div
                                            className="pt_topicattachment"
                                            key={file.file_path}
                                            style={{ textAlign: "center" }}
                                          >
                                            <a
                                              onClick={() =>
                                                window.open(
                                                  file.file_path,
                                                  "_blank"
                                                )
                                              }
                                              data-tooltip={showFileName(
                                                file.file_name
                                              )}
                                              data-placement="bottom"
                                              className="cu-pointer"
                                            >
                                              <Image
                                                src={getFileIcon(
                                                  file.file_path
                                                )}
                                                alt={file.file_name}
                                                width={30}
                                                height={30}
                                                style={{
                                                  width: "30px",
                                                  height: "30px",
                                                  objectFit: "contain",
                                                }}
                                              />
                                            </a>
                                          </div>
                                        );
                                      }
                                    )}
                                    <div className="right">
                                      {val.comment_editable && (
                                        <>
                                          <button
                                            onClick={() => {
                                              setEditCommentIndex(targetIndex);
                                              setUpdateCommentData(val);
                                              setTimeout(() => {
                                                commentUpdateRef.current.setHTML(
                                                  val.answer_comment
                                                );
                                              }, 500);
                                            }}
                                            className="commentbutton smallbutton subtle"
                                            style={{ marginRight: "5px" }}
                                          >
                                            <i className="fa-light fa-edit"></i>
                                            Edit
                                          </button>
                                          <button
                                            className="commentbutton smallbutton subtle"
                                            style={{ marginRight: "5px" }}
                                            onClick={() => {
                                              setOpenDeleteConfirmation(true);
                                              setUpdateCommentData(val);
                                            }}
                                          >
                                            <i className="fa-light fa-trash"></i>
                                            Delete
                                          </button>
                                        </>
                                      )}
                                      {val.your_response != "Flag" &&
                                        decodeTokenData && (
                                          <button
                                            className="commentbutton smallbutton subtle"
                                            onClick={() => toggleModal(val)}
                                            disabled={disableReportBtn}
                                          >
                                            <i className="fa-light fa-flag"></i>
                                            Report
                                          </button>
                                        )}
                                      {val.your_response == "Flag" &&
                                        decodeTokenData && (
                                          <button
                                            style={{
                                              background: "#FFD580",
                                              border: "1px solid #FFD580",
                                              cursor: "default",
                                            }}
                                            className="commentbutton smallbutton subtle"
                                          >
                                            <i className="fa-light fa-flag"></i>
                                            Reported
                                          </button>
                                        )}
                                    </div>
                                  </div>
                                )}
                                {editCommentIndex == targetIndex && (
                                  <div className="pt_newcomment">
                                    <h4>Post a reply</h4>
                                    <YsEditor
                                      id={
                                        val.answer_comment_owner_name +
                                        val.answer_comment_id
                                      }
                                      ref={commentUpdateRef}
                                    />
                                    <br />

                                    <div>
                                      <div>
                                        <MultipleFileHandler
                                          titleName=""
                                          filesToAccept={`${UploadImage.jpegAndPng.toString()},application/pdf,${
                                            uploadFile.word
                                          }`}
                                          existingFiles={
                                            updateCommentData?.answer_comment_attachment
                                          }
                                          afterFileChange={(
                                            modifiedFiles: any
                                          ) => {
                                            setUpdateCommentData(
                                              (prevData: any) => ({
                                                ...prevData,
                                                answer_comment_attachment:
                                                  modifiedFiles,
                                              })
                                            );
                                          }}
                                          fileNameTruncateSize={37}
                                        />
                                      </div>
                                      <div className="right">
                                        <button
                                          disabled={disableCommentsBtn}
                                          className="commentbutton secondary"
                                          onClick={() => handleUpdateComments()}
                                        >
                                          <i className="fa-light fa-comment-plus"></i>
                                          Update reply
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      ))}
                    </div>
                    {totalRecords > 4 && (
                      <BlogPagination
                        pageSize={4}
                        currentPage={currentPage}
                        onPageChange={(page) => {
                          setCurrentPage(page);
                        }}
                        totalRecords={totalRecords}
                      ></BlogPagination>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="pt_links">
        <div className="pt_linksinner">
          <div className="container-fluid">
            <br />
            <br />
            <div className="center">
              <h3>Still have questions?</h3>
              <p>We're here to help! Get in touch with our support team</p>
            </div>
            <div className="grid">
              <Link href={AppRoutes.SUPPORT} className="pt_linksbox">
                <lottie-player
                  autoplay
                  loop
                  mode="normal"
                  src="/json/rbicons/supportrequest.json"
                ></lottie-player>
                <h4 className="oceantext">Contact support</h4>
                <p>Get help with your PayTrade account and products</p>
              </Link>
              <a
                onClick={() =>
                  navToLoginPageDiscussionAndProductIdea("discussion")
                }
                className="pt_linksbox cu-pointer"
              >
                <lottie-player
                  autoplay
                  loop
                  mode="normal"
                  src="/json/rbicons/users.json"
                ></lottie-player>
                <h4 className="oceantext">Start discussion</h4>
                <p>
                  Ask questions and share your knowledge with other PayTrade
                  users
                </p>
              </a>
              <a
                onClick={() =>
                  navToLoginPageDiscussionAndProductIdea("productIdea")
                }
                className="pt_linksbox cu-pointer"
              >
                <lottie-player
                  autoplay
                  loop
                  mode="normal"
                  src="/json/rbicons/ideas.json"
                ></lottie-player>
                <h4 className="oceantext">Create product idea</h4>
                <p>Suggest new products and features to be added to PayTrade</p>
              </a>
            </div>
          </div>
        </div>
      </div>

      {openReport && (
        <BaseModal
          displayModal={openReport}
          onClose={() => {
            setSelectedOption("Inappropriate");
            setReportMessage("");
            setOpenReport(false);
          }}
          secondButtonName="Submit"
          firstButtonName="Cancel"
          title={"Report this discussion"}
          onConfirm={() => {
            handleReportSubmission({
              ...currentData,
              cmty_flag_type: selectedOption,
              flag_reason: reportMessage,
              reaction_type: "Flag",
            });
            return true;
          }}
        >
          <div>
            <p>What's wrong with this discussion?</p>
            <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
              <label>
                <input
                  type="radio"
                  name="updatebalance"
                  value="Inappropriate"
                  checked={selectedOption === "Inappropriate"}
                  onChange={(e) => setSelectedOption(e.target.value)}
                />
                This post is inappropriate
              </label>
              <label>
                <input
                  type="radio"
                  name="updatebalance"
                  value="Spam"
                  checked={selectedOption === "Spam"}
                  onChange={(e) => setSelectedOption(e.target.value)}
                />
                Report as spam
              </label>
            </div>
            <br />
            <textarea
              name="report"
              placeholder="Leave the moderator a message (optional)"
              aria-label="Report"
              value={reportMessage}
              maxLength={100}
              onChange={(e) => setReportMessage(e.target.value)}
            />
          </div>
        </BaseModal>
      )}
      {openDeleteTopicConfirmation && (
        <BaseModal
          displayModal={openDeleteTopicConfirmation}
          onClose={() => {
            setOpenDeleteTopicConfirmation(false);
          }}
          secondButtonName="Yes"
          firstButtonName="No"
          title=""
          onConfirm={() => {
            handleDeleteTopic();
            return true;
          }}
        >
          <h4 className="text_center">Are you sure you wish to delete?</h4>
        </BaseModal>
      )}
      {openDeleteConfirmation && (
        <BaseModal
          displayModal={openDeleteConfirmation}
          onClose={() => {
            setOpenDeleteConfirmation(false);
          }}
          secondButtonName="Yes"
          firstButtonName="No"
          title=""
          onConfirm={() => {
            handleDeleteComments();
            return true;
          }}
        >
          <h4 className="text_center">
            Are you sure you wish to delete this comment?
          </h4>
        </BaseModal>
      )}
    </main>
  );
}
