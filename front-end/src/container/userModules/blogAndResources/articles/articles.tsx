"use client";

import React, { Fragment, useEffect, useState } from "react";
import styles from "./articles.module.scss";
import { Col, Container, Row } from "react-bootstrap";

import Footer from "@/components/footer/footer";
import NavbarComponent from "@/components/header/navbar";
import { useRouter } from "next/navigation";
import DropdownLoginSignup from "@/components/header/navUserSection";
import NavbarLinks from "@/components/header/navLinks";
import { Navbar as RBNavbar } from "react-bootstrap";
import { getCookie, setCookie } from "cookies-next";
import { WelcomeUser } from "../../../welcomeUser/welcomeUser";
import Cards from "@/components/CardBlock/CardBlock";
import FormButton from "@/components/Button/button";
import { fetchCategoryList } from "../blogAndResources.function";
import moment from "moment";
import { ApplicationURLS } from "@/common/applicationURLS";
import { useTokenDetails } from "@/common/commonHooks";

const VIEW_ALL = "viewAll";
const INDIVIDUAL_CARD = "individualCard";

const ArticlesPage = () => {
  const [isWelcomeModalDisplay, setIsWelcomeModalDisplay] = useState(false);
  const [isCookiesModalDisplay, setIsCookiesModalDisplay] = useState(false);
  const [resourcesData, setResourcesData] = useState([]);

  const { decodeTokenData }: any = useTokenDetails();

  useEffect(() => {
    if (!getCookie("country")) {
      setIsWelcomeModalDisplay(true);
    }
    getResources();
  }, []);

  const router = useRouter();

  async function getResources() {
    const postData: any = {
      contentType: "Resource",
    };

    await fetchCategoryList(postData).then((response: any) => {
      setResourcesData(response?.blogResources);
    });
  }

  function handleRoutes(data: any, typeOfAction: string) {
    if (typeOfAction === VIEW_ALL) {
      setCookie("category", data?.category?.value);
      router.push(
        `${ApplicationURLS.RESOURCES_CATEGORY}/${
          data?.category?.value ? data?.category?.value.toLowerCase() : ""
        }`
      );
    } else if (typeOfAction === INDIVIDUAL_CARD) {
      setCookie("resourceId", data?.id);
      router.push(
        `${ApplicationURLS.RESOURCES_RECOMMENDED}${data?.title
          .replaceAll(" ", "-")
          .toLowerCase()}/${data?.id}`
      );
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
          {resourcesData?.length > 0 && (
            <div className={styles.headBlog}>
              <h3 className="mb-4 text-center">Resources</h3>
              <div className={styles.subText}>
                Tax and bookkeeping basics you need to run and grow your
                business.
              </div>
            </div>
          )}

          {resourcesData?.length > 0 &&
            resourcesData.map((overallData: any) => (
              <Row className={styles.cardAction} key={overallData?.id}>
                {overallData?.blogResources?.length > 0 &&
                  overallData?.blogResources.map((individualCategory: any) => (
                    <Col
                      lg={4}
                      key={individualCategory?.created_on}
                      onClick={() =>
                        handleRoutes(individualCategory, INDIVIDUAL_CARD)
                      }
                    >
                      <div className={styles.cardBlock}>
                        <Cards
                          imgSrc={
                            individualCategory?.banner?.file_path ||
                            "/assets/image-placeholder.jpg"
                          }
                          title={individualCategory?.title}
                          subHeading={individualCategory?.category?.value}
                          subtitle={
                            moment(individualCategory?.created_on).format(
                              "LL"
                            ) ?? ""
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
                      handleRoutes(overallData?.blogResources[0], VIEW_ALL)
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
};

export default ArticlesPage;
