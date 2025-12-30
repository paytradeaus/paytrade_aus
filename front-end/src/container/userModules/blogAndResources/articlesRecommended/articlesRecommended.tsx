"use client";

import React, { useEffect, useState } from "react";
import styles from "./articlesRecommended.module.scss";

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
import { fetchIndividualCategory } from "../blogAndResources.function";
import { ApplicationURLS } from "@/common/applicationURLS";
import moment from "moment";
import SocialShareOptions from "../../socialShareOptions/socialShareOptions";
import { useAppSelector } from "@/redux/store";
import { useTokenDetails } from "@/common/commonHooks";

function ArticlesRecommendedPage() {
  const [isWelcomeModalDisplay, setIsWelcomeModalDisplay] = useState(false);
  const [isCookiesModalDisplay, setIsCookiesModalDisplay] = useState(false);
  const [articleCategories, setArticleCategories] = useState<any>([]);

  useEffect(() => {
    if (!getCookie("country")) {
      setIsWelcomeModalDisplay(true);
    }

    getArticlesCategory();
  }, []);

  const { decodeTokenData }: any = useTokenDetails();

  const router = useRouter();

  async function getArticlesCategory() {
    const postData: any = {
      slugOrId: getCookie("resourceId"),
    };

    await fetchIndividualCategory(postData).then((data: any) => {
      const response = data;

      setArticleCategories(response);
    });
  }

  function handleAuthorClick() {
    const author = articleCategories?.blogResource?.author;

    setCookie("author", author?.id);

    router.push(
      `${ApplicationURLS.RESOURCES_AUTHOR}/${
        author ? author?.first_name.toLowerCase() : ""
      }`
    );
  }

  function handleRecommendations(data: any) {
    setCookie("resourceId", data?.id);

    router.push(
      `${ApplicationURLS.RESOURCES_CATEGORY}${data?.title.replaceAll(" ", "-")}`
    );
    getArticlesCategory();
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
          {articleCategories?.blogResource?.banner?.file_path && (
            <div className={styles.microimage}>
              <Image
                src={articleCategories?.blogResource?.banner?.file_path}
                layout="responsive"
                alt="img"
                className="d-inline-block align-top"
                width={500}
                height={300}
              />
            </div>
          )}

          <h3 className={styles.categoryHead}>
            {articleCategories?.blogResource?.category?.value}
          </h3>
          <div className={styles.headBlog}>
            <h3 className={styles.categorySubHead}>
              {articleCategories?.blogResource?.title}
            </h3>
          </div>
          <div className={styles.nameCategory}>
            <div>
              By{" "}
              <span
                onClick={() => handleAuthorClick()}
                className={styles.authorTitle}
              >
                {articleCategories?.blogResource?.author?.first_name}
              </span>
            </div>
            <div>
              {moment(
                articleCategories?.blogResource?.author?.created_on
              ).format("LL") ?? ""}
            </div>
          </div>
          <div className={styles.footerIcons}>
            <SocialShareOptions />
          </div>
          <div className={styles.contentCategory}>
            <div
              dangerouslySetInnerHTML={{
                __html: articleCategories?.blogResource?.content,
              }}
            />
            {articleCategories?.blogResource?.attachment && (
              <FormButton
                className={styles.buttonStyles}
                onClick={() => router.push("")}
                href={articleCategories?.blogResource?.attachment?.file_path}
                target="_blank"
                rel="noopener noreferrer"
                download
              >
                Download Resource
              </FormButton>
            )}
            <div className={styles.seperatorLine}></div>
            <div className={styles.shareStyles}>
              <span>Share</span>
              <div className={styles.shareFooterIcons}>
                <SocialShareOptions />
              </div>
            </div>
          </div>
          {articleCategories?.suggestions?.length > 0 && (
            <h3 className={styles.categoryRecHead}>Recommended for you</h3>
          )}
          <Row className={styles.rowHead}>
            {articleCategories?.suggestions?.length > 0 &&
              articleCategories?.suggestions.map((item: any, i: number) => (
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

          <Row className={styles.homeFormStyle}></Row>
        </Container>
        <div>
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default ArticlesRecommendedPage;
