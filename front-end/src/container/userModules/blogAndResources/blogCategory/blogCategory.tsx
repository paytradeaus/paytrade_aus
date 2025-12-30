"use client";

import React, { useEffect, useState } from "react";
import styles from "./blogCategory.module.scss";

import { Col, Container, Row } from "react-bootstrap";

import NavbarComponent from "@/components/header/navbar";
import DropdownLoginSignup from "@/components/header/navUserSection";
import NavbarLinks from "@/components/header/navLinks";
import { Navbar as RBNavbar } from "react-bootstrap";
import { getCookie, setCookie } from "cookies-next";

import Cards from "@/components/CardBlock/CardBlock";

import moment from "moment";
import { WelcomeUser } from "@/container/welcomeUser/welcomeUser";
import { fetchBlogsAndResources } from "../blogAndResources.function";
import { ApplicationURLS } from "@/common/applicationURLS";
import { useRouter } from "next/navigation";
import { useTokenDetails } from "@/common/commonHooks";

const BlogCategoryPage = () => {
  const [isWelcomeModalDisplay, setIsWelcomeModalDisplay] = useState(false);
  const [isCookiesModalDisplay, setIsCookiesModalDisplay] = useState(false);
  const [blogData, setBlogData] = useState([]);

  const router = useRouter();

  const { decodeTokenData }: any = useTokenDetails();

  useEffect(() => {
    if (!getCookie("country")) {
      setIsWelcomeModalDisplay(true);
    }
    getBlog();
  }, []);

  async function getBlog() {
    const postData: any = {
      listBlogResourceInput: {
        contentType: "Blog",
        category: getCookie("category"),
        author: null,
        keyword: null,
      },
    };

    await fetchBlogsAndResources(postData).then((response: any) => {
      setBlogData(response?.blogResources);
    });
  }

  function handleRoute(data: any) {
    setCookie("blogId", data?.id);
    router.push(
      `${ApplicationURLS.USER_BLOG_RECOMMENDED}${data?.title.replaceAll(
        " ",
        "-"
      )}`
    );
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
          <div className={styles.headBlog}>
            <h3 className="mb-4 text-center">Accounts</h3>
            <div className={styles.subText}>
              The account basics you need to stay compliant and run your
              business with confidence.
            </div>
          </div>

          <Row className="mt-4">
            {blogData?.length > 0 &&
              blogData.map((item: any, i: number) => (
                <Col lg={4} key={i} onClick={() => handleRoute(item)}>
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
        </Container>
        {/* <div>
          <Footer />
        </div> */}
      </div>
    </div>
  );
};

export default BlogCategoryPage;
