"use client";

import React, { Fragment, useEffect, useState } from "react";
import styles from "./blog.module.scss";
import { Col, Container, Row, Navbar as RBNavbar } from "react-bootstrap";
import Footer from "@/components/footer/footer";
import NavbarComponent from "@/components/header/navbar";
import { useRouter } from "next/navigation";
import DropdownLoginSignup from "@/components/header/navUserSection";
import NavbarLinks from "@/components/header/navLinks";
import { getCookie, setCookie } from "cookies-next";
import { WelcomeUser } from "../../../welcomeUser/welcomeUser";
import Cards from "@/components/CardBlock/CardBlock";
import FormButton from "@/components/Button/button";

import moment from "moment";
import { ApplicationURLS } from "@/common/applicationURLS";
import {
  fetchBlogsAndResources,
  fetchCategoryList,
} from "../blogAndResources.function";
import { useAppSelector } from "@/redux/store";
import { useTokenDetails } from "@/common/commonHooks";

const VIEW_ALL = "viewAll";
const INDIVIDUAL_CARD = "individualCard";

function BlogPage() {
  const [isWelcomeModalDisplay, setIsWelcomeModalDisplay] = useState(false);
  const [isCookiesModalDisplay, setIsCookiesModalDisplay] = useState(false);
  const [blogData, setBlogData] = useState<any>([]);
  const [noDataMessage, setNoDataMessage] = useState("");

  const { decodeTokenData }: any = useTokenDetails();

  useEffect(() => {
    if (!getCookie("country")) {
      setIsWelcomeModalDisplay(true);
    }
    getBlog();
  }, []);

  const router = useRouter();

  async function getBlog() {
    const postData: any = {
      contentType: "Blog",
    };

    await fetchCategoryList(postData).then((data: any) => {
      setBlogData(data?.blogResources);

      setNoDataMessage(
        data?.blogResources?.length ? "" : "No Blogs to display !"
      );
    });
  }

  function handleRoutes(data: any, typeOfAction: string) {
    if (typeOfAction === VIEW_ALL) {
      setCookie("category", data?.category?.value);
      router.push(
        `${ApplicationURLS.BLOG_CATEGORY}/${
          data?.category?.value ? data?.category?.value.toLowerCase() : ""
        }`
      );
    } else if (typeOfAction === INDIVIDUAL_CARD) {
      setCookie("blogId", data?.id);

      router.push(`${ApplicationURLS.USER_BLOG_RECOMMENDED}${data?.id}`);
    }
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
          {blogData?.length ? (
            <div className={styles.headBlog}>
              <h3 className="mb-4 text-center">Blogs</h3>
              <div className={styles.subText}>
                Our simple trust account administration software helps you to
                implement and administer the QBCC regulatory requirements for
                project trust and project retention accounts.
              </div>
            </div>
          ) : (
            <h3 className="mb-4 text-center">{noDataMessage}</h3>
          )}

          {blogData?.length > 0 &&
            blogData.map((overallBlogData: any) => (
              <Row className={styles.cardAction} key={overallBlogData?.id}>
                {overallBlogData?.blogResources?.length > 0 &&
                  overallBlogData?.blogResources.map((blogCategory: any) => (
                    <Col
                      lg={4}
                      onClick={() =>
                        handleRoutes(blogCategory, INDIVIDUAL_CARD)
                      }
                      key={blogCategory?.created_on}
                    >
                      <div className={styles.cardBlock}>
                        <Cards
                          imgSrc={
                            (blogCategory?.banner &&
                              blogCategory?.banner?.file_path) ||
                            "/assets/image-placeholder.jpg"
                          }
                          title={blogCategory?.title}
                          subHeading={blogCategory?.category?.value}
                          subtitle={
                            moment(blogCategory?.created_on).format("LL") ?? ""
                          }
                          width={300}
                          height={250}
                          heading={""}
                          description={""}
                        />
                      </div>
                    </Col>
                  ))}

                <Col xs={12}>
                  <FormButton
                    className={styles.buttonStyles}
                    onClick={() =>
                      handleRoutes(overallBlogData?.blogResources[0], VIEW_ALL)
                    }
                  >
                    See All
                  </FormButton>
                </Col>
              </Row>
            ))}

          <Row className={styles.homeFormStyle}></Row>
        </Container>
        <div>
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default BlogPage;
