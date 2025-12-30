"use client";

import React, { Fragment, useEffect, useState } from "react";
import styles from "./blogRecommended.module.scss";
import { Col, Container, Row } from "react-bootstrap";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Footer from "@/components/footer/footer";
import NavbarComponent from "@/components/header/navbar";
import DropdownLoginSignup from "@/components/header/navUserSection";
import NavbarLinks from "@/components/header/navLinks";
import { Navbar as RBNavbar } from "react-bootstrap";
import { getCookie, setCookie } from "cookies-next";
import { WelcomeUser } from "../../../welcomeUser/welcomeUser";
import Cards from "@/components/CardBlock/CardBlock";
import FormButton from "@/components/Button/button";
import TextField from "@/components/TextField/textField";

import moment from "moment";
import { ApplicationURLS } from "@/common/applicationURLS";
import {
  fetchIndividualCategory,
  postComment,
} from "../blogAndResources.function";
import SocialShareOptions from "../../socialShareOptions/socialShareOptions";
import { useAppDispatch } from "@/redux/store";
import { ALL_ADMIN_ROLES } from "@/common/constants/roles";
import { useTokenDetails } from "@/common/commonHooks";
import { setBlogDetailsForRouting } from "@/redux/slices/dashboardSlices";

function BlogRecommendedPage() {
  const [isWelcomeModalDisplay, setIsWelcomeModalDisplay] = useState(false);
  const [isCookiesModalDisplay, setIsCookiesModalDisplay] = useState(false);
  const [blogData, setBlogData] = useState<any>([]);

  const [loading, setLoading] = useState(false);

  const [commentValue, setCommentValue] = useState("");
  const [commentError, setCommentError] = useState(false);

  const { decodeTokenData }: any = useTokenDetails();
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(setBlogDetailsForRouting({}));
    if (!getCookie("country")) {
      setIsWelcomeModalDisplay(true);
    }

    getBlog();
  }, []);

  const router = useRouter();

  async function getBlog() {
    const postData: any = {
      slugOrId: getCookie("blogId"),
    };

    await fetchIndividualCategory(postData).then((response: any) => {
      setBlogData(response);
    });
  }

  function handleAuthorClick() {
    const author = blogData?.blogResource?.author;
    setCookie("author", author?.id);

    router.push(
      `${ApplicationURLS.BLOG_AUTHOR}/${
        author ? author?.first_name.toLowerCase() : ""
      }`
    );
  }

  function handleRecommendations(data: any) {
    setCookie("blogId", data?.id);
    router.push(
      `${ApplicationURLS.USER_BLOG_RECOMMENDED}${data?.title.replaceAll(
        " ",
        "-"
      )}`
    );
    getBlog();
  }

  function handleCommentSubmit() {
    if (!decodeTokenData) {
      dispatch(setBlogDetailsForRouting(blogData));
      router.push(ApplicationURLS.USER_LOGIN);
    } else if (!commentValue) {
      validateComment(commentValue);
    } else {
      commentOnBlog();
    }
  }

  async function commentOnBlog() {
    setLoading(true);
    const postData = {
      slugOrId: getCookie("blogId") ?? "",
      addBlogCommentInput: {
        blogId: getCookie("blogId"),
        comment: commentValue,
      },
    };

    const response = await postComment(postData);
    if (response) {
      setCommentValue("");
    }
    setLoading(false);
  }

  function validateComment(value: string) {
    if (!value) {
      setCommentError(true);
    } else {
      setCommentError(false);
    }
    setCommentValue(value);
  }

  return (
    <div className={styles.mainContainer}>
      <WelcomeUser
        displayWelcomeModal={isWelcomeModalDisplay}
        onWelcomeModalClose={(value: boolean) => {
          setIsWelcomeModalDisplay(value);
          setIsCookiesModalDisplay(!value);
        }}
        displayAcceptCookiesMOdal={isCookiesModalDisplay}
        onCookiesModalClose={(value: boolean) =>
          setIsCookiesModalDisplay(value)
        }
      />

      <NavbarComponent navlinkClass={""}>
        <>
          <RBNavbar.Toggle aria-controls="basic-navbar-nav" />
          <RBNavbar.Collapse id="basic-navbar-nav" className="collapseNav">
            <NavbarLinks tokenData={decodeTokenData} />
            <DropdownLoginSignup />
          </RBNavbar.Collapse>
        </>
      </NavbarComponent>
      <div className={styles.homeContainerStyle}>
        <Container>
          {blogData?.blogResource?.banner?.file_path && (
            <div className={styles.microimage}>
              <Image
                src={blogData?.blogResource?.banner?.file_path}
                layout="responsive"
                alt="img"
                className="d-inline-block align-top"
                width={500}
                height={300}
              />
            </div>
          )}

          <h3 className={styles.categoryHead}>
            {blogData?.blogResource?.category?.value}
          </h3>
          <div className={styles.headBlog}>
            <h3 className={styles.categorySubHead}>
              {blogData?.blogResource?.title}
            </h3>
          </div>
          <div className={styles.nameCategory}>
            <div>
              By{" "}
              <span
                onClick={() => handleAuthorClick()}
                className={styles.authorTitle}
              >
                {blogData?.blogResource?.author?.first_name}
              </span>
            </div>
            <div>
              {moment(blogData?.blogResource?.author?.created_on).format(
                "LL"
              ) ?? ""}
            </div>
          </div>
          <div className={styles.footerIcons}>
            <SocialShareOptions />
          </div>
          <div className={styles.contentCategory}>
            <div
              dangerouslySetInnerHTML={{
                __html: blogData?.blogResource?.content,
              }}
            />

            <div className={styles.seperatorLine}></div>
            <div className={styles.shareStyles}>
              <span>Share</span>
              <div className={styles.shareFooterIcons}>
                <SocialShareOptions />
              </div>
            </div>
          </div>
          {blogData?.suggestions?.length > 0 && (
            <h3 className={styles.categoryRecHead}>Recommended for you</h3>
          )}
          <Row className={styles.rowHead}>
            {blogData?.suggestions?.length > 0 &&
              blogData?.suggestions.map((item: any, i: number) => (
                <Col lg={4} key={i} onClick={() => handleRecommendations(item)}>
                  <div className={styles.cardBlock}>
                    <Cards
                      imgSrc={
                        item?.banner?.file_path ||
                        "/assets/image-placeholder.jpg"
                      }
                      title={item?.title || ""}
                      subHeading={item?.category?.value || ""}
                      subtitle={moment(item?.created_on).format("LL") ?? ""}
                      width={300}
                      height={250}
                      heading={""}
                      description={""}
                    />
                  </div>
                </Col>
              ))}
          </Row>
          {decodeTokenData &&
          ALL_ADMIN_ROLES.some((x: any) => x === decodeTokenData.role) ? (
            <></>
          ) : (
            <Fragment>
              {blogData?.blogResource?.comment?.length > 0 &&
                blogData.blogResource?.comment.map((commentData: any) => (
                  <div className={styles.commentSection} key={commentData?.id}>
                    <div className={styles.authorComment}>
                      <Image
                        src={commentData?.comment_owner_image_base64}
                        alt="Author"
                        className={styles.authorImg}
                        width={57}
                        height={57}
                      />
                      <span className={styles.commentHead}>
                        {" "}
                        {commentData?.comment_owner_name}
                      </span>
                    </div>
                    <div className="mb-3">
                      {moment(commentData?.posted_on).format("LL") ?? ""}
                    </div>
                    {commentData?.comment}
                  </div>
                ))}
              <h3 className={styles.comment}>Leave a Comment</h3>
              <div className={styles.commentBlock}>
                {decodeTokenData && (
                  <Fragment>
                    {" "}
                    <TextField
                      placeholder={decodeTokenData?.userName}
                      type="text"
                      disabled
                      className={styles.textFieldNameStyles}
                    />
                    <TextField
                      placeholder=""
                      as="textarea"
                      value={commentValue}
                      onChange={(e: any) => validateComment(e?.target?.value)}
                      type="text"
                      className={styles.textFieldStyles}
                      disabled={!decodeTokenData}
                      errorText={"Comment is required"}
                      isInvalid={commentError && !commentValue}
                    />
                  </Fragment>
                )}
                <FormButton
                  type={"button"}
                  className={styles.btnComment}
                  onClick={() => handleCommentSubmit()}
                  disabled={loading}
                >
                  {decodeTokenData ? "Post Comment" : "Log in to Comment"}
                </FormButton>
              </div>
            </Fragment>
          )}

          <Row className={styles.homeFormStyle}></Row>
        </Container>
        <div>
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default BlogRecommendedPage;
