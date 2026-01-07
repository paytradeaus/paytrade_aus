import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  fetchCategoryList,
  fetchIndividualCategory,
  listAllCategory,
  postComment,
} from "../Blogs/Blogs.functions";
import moment from "moment";
import CustomEditor from "@/components/ysEditor";
import { useTokenDetails } from "@/hooks";
import { useRouter } from "next/navigation";
import DefaultImage from "../../../../public/images/blogimage1.png";
import { slugifyString } from "@/utils";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { setBlogDetailsForRouting } from "@/redux/slices/dashboardSlices";
import { useAppDispatch } from "@/redux/store";
import YsEditor from "@/components/ysEditor";
import { showErrorToast } from "@/components/Toaster";
import DOMPurify from "dompurify";

// Create a placeholder component to wrap with the HOC

export default function contentDetailPage({
  contentType,
  title,
  route,
  downloadResource = false,
}: any) {
  const [blogData, setBlogData] = useState<any[]>([]);
  const [blogDetails, setBlogDetails] = useState<any>();
  const [noDataMessage, setNoDataMessage] = useState("");
  const { decodeTokenData }: any = useTokenDetails();
  const [commentError, setCommentError] = useState(false);
  const [categoryList, setCategoryList] = useState<any[]>([]);
  const editorRef = useRef<any>(null);
  const dispatch = useAppDispatch();
  const params = useParams();
  const router = useRouter();
  const category = params?.category;
  async function getBlog() {
    const postData: any = {
      slugOrId: params?.slug?.[1],
    };

    await fetchIndividualCategory(postData).then((response: any) => {
      setBlogDetails(response);
    });

    const categoryPostData = { contentType };
    const categoryData = await listAllCategory({
      listBlogResourceInput: categoryPostData,
    });

    const newCategoryList = [
      { label: "Latest articles", slug: "latest-articles" },
      ...(categoryData || []).map((val: any) => ({
        label: val,
        slug: slugifyString(val),
      })),
    ];

    setCategoryList(newCategoryList);
  }

  useEffect(() => {
    dispatch(setBlogDetailsForRouting({}));
    getBlogData();
    getBlog();
  }, []);

  const getBlogData = async () => {
    const postData = { contentType };
    const data = await fetchCategoryList(postData);
    setBlogData(data?.blogResources || []);
    setNoDataMessage(
      data?.blogResources?.length ? "" : `No ${title}s to display!`
    );
  };

  function handleCommentSubmit() {
    if (!decodeTokenData) {
      dispatch(
        setBlogDetailsForRouting({
          url: `/blog/${category}/${params?.slug?.[0]}/${params?.slug?.[1]}`,
        })
      );
      router.push(AppRoutes.USER_LOGIN);
    } else if (!editorRef.current.getText()) {
      validateComment(editorRef.current.getText());
    } else {
      commentOnBlog();
    }
  }

  async function commentOnBlog() {
    // setLoading(true);
    const postData = {
      slugOrId: params?.slug?.[1] ?? "",
      addBlogCommentInput: {
        blogId: params?.slug?.[1],
        comment: DOMPurify.sanitize(editorRef.current.getHTML()),
      },
    };
    const response = await postComment(postData);
    if (response) {
      editorRef.current.setHTML("");
      setCommentError(false);
    }
    // setLoading(false);
  }

  function validateComment(value: string) {
    if (!value) {
      showErrorToast("Comment is required");
      setCommentError(true);
    } else {
      setCommentError(false);
    }
    editorRef.current.setHTML("");
  }
  return (
    <main>
      <div className="pt_titletop">
        <div className="container-fluid">
          <div className="pt_breadcrumbs">
            <Link href={"/" + route} className="contrast">
              {title}
            </Link>
            <i className="fa-light fa-chevron-right"></i>
            <Link href={"/" + route + "/" + category} className="contrast">
              {category}
            </Link>
            <i className="fa-light fa-chevron-right"></i>
            <span>{blogDetails?.blogResource?.title}</span>
          </div>
        </div>
      </div>

      <div className="pt_blog">
        <div className="container-fluid">
          <div className="bloggrid">
            <div className="pt_blogleft">
              <h4>Categories</h4>
              <ul>
                {categoryList?.map((categoryItem: any) => (
                  <li key={categoryItem.label}>
                    <Link href={"/" + route + "/" + categoryItem.slug}>
                      {categoryItem.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt_blogright">
              <div className="pt_bloginner">
                <div className="container-fluid">
                  <h4>{blogDetails?.blogResource?.title}</h4>
                  <article>
                    {!blogDetails?.blogResource?.video_link && (
                      <Image
                        src={
                          blogDetails?.blogResource?.banner?.file_path ||
                          DefaultImage
                        }
                        layout="responsive"
                        alt={blogDetails?.blogResource?.title}
                        className="d-inline-block align-top"
                        width={500}
                        height={300}
                      />
                    )}
                    <div
                      dangerouslySetInnerHTML={{
                        __html: blogDetails?.blogResource?.content,
                      }}
                    />
                    {downloadResource &&
                      blogDetails?.blogResource?.attachment?.file_path && (
                        <button
                          type="button"
                          className="commentbutton secondary"
                          onClick={() =>
                            window.open(
                              blogDetails.blogResource.attachment.file_path,
                              "_blank"
                            )
                          }
                        >
                          Download resource
                        </button>
                      )}
                    {blogDetails?.blogResource?.video_link && (
                      <>
                        <iframe
                          src={blogDetails?.blogResource?.video_link}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={"title"}
                          style={{
                            width: "100%",
                            height: "100vh",
                          }}
                        ></iframe>
                        <br />
                      </>
                    )}
                  </article>

                  {blogDetails?.blogResource?.enable_comments &&
                    title != "Resource" && (
                      <div className="pt_comments">
                        {decodeTokenData && (
                          <>
                            <h4>Leave a comment</h4>
                            <YsEditor ref={editorRef} />
                          </>
                        )}
                        {/* {commentError && !editorRef.current.getText() && (
                        <div style={{ color: "red", marginTop: "12px" }}>
                          <i className="fa fa-exclamation-triangle"></i>
                          &nbsp;&nbsp;
                          <span>Comment is required</span>
                        </div>
                      )} */}
                        <div className="right">
                          <button
                            className="commentbutton secondary"
                            onClick={() => handleCommentSubmit()}
                          >
                            {decodeTokenData
                              ? "Post Comment"
                              : "Log in to Comment"}
                          </button>
                        </div>
                        {blogDetails?.blogResource?.comment?.length > 0 && (
                          <h4>Comments</h4>
                        )}
                        {blogDetails?.blogResource?.comment?.length > 0 &&
                          blogDetails.blogResource?.comment.map(
                            (commentData: any) => (
                              <div className="comment" key={commentData?.id}>
                                <div className="commenter">
                                  <Image
                                    src={
                                      commentData?.comment_owner_image_base64 ||
                                      DefaultImage
                                    }
                                    alt={commentData?.comment_owner_name}
                                    width={57}
                                    height={57}
                                  />
                                  <div className="commenterinfo">
                                    <h5> {commentData?.comment_owner_name}</h5>
                                    <p>
                                      {moment(commentData?.posted_on).format(
                                        "DD-MM-YYYY hh:mm A"
                                      ) ?? ""}
                                    </p>
                                  </div>
                                </div>
                                <div className="commentcontent">
                                  <p
                                    dangerouslySetInnerHTML={{
                                      __html: DOMPurify.sanitize(
                                        commentData?.comment || ""
                                      ),
                                    }}
                                  ></p>
                                  {/* <div className="right">
                                <button className="commentbutton smallbutton secondary">
                                  <i className="fa-light fa-reply"></i>Reply
                                </button>
                              </div> */}
                                </div>
                              </div>
                            )
                          )}
                      </div>
                    )}

                  {blogDetails?.suggestions?.length > 0 && (
                    <>
                      <h4>Related articles</h4>
                      <div className="grid blogposts">
                        {blogDetails?.suggestions?.map((val: any) => (
                          <Link
                            href={
                              `/${route?.toLowerCase()}/` +
                              slugifyString(val?.category?.value) +
                              "/" +
                              slugifyString(val?.title) +
                              "/" +
                              val?.id
                            }
                            key={val.id}
                            className="pt_blogbox"
                          >
                            <Image
                              style={{ height: "250px" }}
                              src={val?.banner?.file_path || DefaultImage}
                              alt={val?.title || ""}
                              className="d-inline-block align-top"
                              width={500}
                              height={300}
                            />
                            <h4>{val?.title || ""}</h4>
                            <p>{val?.category?.value || ""}</p>
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
