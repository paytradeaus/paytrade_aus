"use client";

import React, { useEffect, useState } from "react";
import styles from "./home.module.scss";
import {
  HOME_TITLE,
  HOME_TEXT,
  BUY_NOW_TEXT,
} from "../../../src/common/constants";
import { Button, Col, Container, Form, Row } from "react-bootstrap";
import Image from "next/image";
import Cards from "@/components/Card/card";
import CircleLogo from "../../../public/assets/homeoffercircle.png";
import WingsLogo from "../../../public/assets/paytrade-wings.png";
import HomeInfoGraphic from "../../../public/assets/home-page-infographic.png";
import { CardArr, infoDeskArr } from "../../common/constants";
import InfoDesk from "../../components/infoDesk/infoDesk";
import Footer from "@/components/footer/footer";
import NavbarComponent from "@/components/header/navbar";
import DropdownLoginSignup from "@/components/header/navUserSection";
import NavbarLinks from "@/components/header/navLinks";
import { Navbar as RBNavbar } from "react-bootstrap";
import { getCookie } from "cookies-next";
import { WelcomeUser } from "../welcomeUser/welcomeUser";
import { RootState, useAppSelector } from "@/redux/store";
import { useTokenDetails } from "@/common/commonHooks";

import UserNavRightSide from "@/components/header/userDashboard/userNavRightSide";
import { useLoaderContext } from "@/context/useLoader";
import { ApplicationURLS } from "@/common/applicationURLS";
import { clearALLCookies } from "@/common/commonFunctions";
import { useRouter } from "next/navigation";
import { InactivityDetector } from "../InactivityDetector/InactivityDetector";

const HomePage = () => {
  const [isWelcomeModalDisplay, setIsWelcomeModalDisplay] = useState(false);
  const [isCookiesModalDisplay, setIsCookiesModalDisplay] = useState(false);
  const router = useRouter();
  const { decodeTokenData }: any = useTokenDetails();

  const appUserDetails: any = useAppSelector(
    (state: RootState) => state?.userDetails?.appUserDetails
  );

  const { tabId }: any = useLoaderContext();

  useEffect(() => {
    const broadcast = new BroadcastChannel("auth-channel");
    const handleLogoutEvent = (event: any) => {
      const { type, tabId: senderTabId } = event?.data || {};
      if (type === "LOGOUT" && senderTabId !== tabId) {
        router.push(ApplicationURLS.HOME);
        clearALLCookies();
        // toast.success(SIGN_OUT_IN_OTHER_TABS_MSG);
      }
    };

    broadcast.addEventListener("message", handleLogoutEvent);

    return () => broadcast.removeEventListener("message", handleLogoutEvent);
  }, []);

  useEffect(() => {
    if (!getCookie("country")) {
      setIsWelcomeModalDisplay(true);
    }
  }, []);

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
          <RBNavbar.Collapse
            id="basic-navbar-nav"
            className="collapseNav justify-content-between"
          >
            <NavbarLinks tokenData={decodeTokenData} />

            {decodeTokenData?.role ? (
              <UserNavRightSide />
            ) : (
              <DropdownLoginSignup />
            )}
          </RBNavbar.Collapse>
        </>
      </NavbarComponent>

      <div className={styles.homeContainerStyle}>
        <Container>
          {/* First Row */}
          <Row className="mb-4">
            <Col lg={10} md={9} sm={9}>
              <h1 className={styles.homeMainContent}>{HOME_TITLE}</h1>
              <p className={styles.homeSubContent}>{HOME_TEXT}</p>
              <button className={styles.buyNowBtn}>{BUY_NOW_TEXT}</button>
            </Col>
            <Col lg={2} md={3} sm={3}>
              <div className={styles.homeCircleLogo}>
                <Image
                  src={CircleLogo.src}
                  layout="responsive"
                  alt="offer details"
                  className="d-inline-block align-top w-100 h-100"
                  width={210}
                  height={150}
                />
              </div>
            </Col>
          </Row>
          {/* Second Row */}

          {/* Cards Row */}
          <Row className={styles.cardsContainerView}>
            <Row className={styles.responsiveWingsLogo}>
              <Col>
                <Image
                  src={WingsLogo.src}
                  alt="wings logo"
                  layout="responsive"
                  className="d-inline-block align-top"
                  height={150}
                  width={1250}
                />
              </Col>
            </Row>
            {CardArr.slice(0, 4).map((item, i) => (
              <Col lg={3} key={i}>
                <Cards
                  heading={item?.heading || ""}
                  imgSrc={item?.imgSrc || ""}
                  title={item.title}
                  subtitle={item?.subtitle || ""}
                  description={item.description}
                  width={item?.width || 0}
                  height={item?.height || 0}
                />
              </Col>
            ))}
          </Row>
          {/* Third Row */}
          <Row>
            <h3 className={styles.HomeInfoText}>
              How can Pay-Trade help you today?
            </h3>
            <Col
              className={`${styles.HomeInfoImg} ${styles.responsiveHomeInfoImg}`}
            >
              <Image
                src={HomeInfoGraphic.src}
                alt="offer details"
                layout="responsive"
                className="d-inline-block align-top bg-white"
                width={970}
                height={750}
              />
            </Col>
          </Row>
          {/* Fourth Row */}
          <Row>
            {infoDeskArr.map((item, index) => (
              <InfoDesk
                key={index}
                index={index}
                heading={item.heading}
                spantext={item.spantext}
                content={item.content}
                anchortext={item.anchortext}
                imgSrc={item.imgSrc}
                width={item?.width || 0}
                height={item?.height || 0}
              />
            ))}
          </Row>

          <h3 className={styles.HomeInfoTextWithBg}>
            Do you need a Project or Retention Trust Account?
          </h3>

          {/* 5th row */}
          <Row>
            {CardArr.slice(4, 8).map((item, i) => (
              <Col lg={3} md={3} sm={3} key={i}>
                <Cards
                  heading={item?.heading || ""}
                  imgSrc={item?.imgSrc || ""}
                  title={item.title}
                  subtitle={item?.subtitle || ""}
                  description={item.description}
                  width={item?.width || 0}
                  height={item?.height || 0}
                />
              </Col>
            ))}
          </Row>
          {/* 6th row */}
          <Row className={styles.mt6}>
            {CardArr.slice(8, 12).map((item, i) => (
              <Col lg={3} key={i}>
                <Cards
                  heading={item?.heading || ""}
                  imgSrc={item?.imgSrc || ""}
                  title={item.title}
                  subtitle={item?.subtitle || ""}
                  description={item.description}
                  width={item?.width || 0}
                  height={item?.height || 0}
                />
              </Col>
            ))}
          </Row>
          {/*7th Row */}
          <div className={styles.homeFormStyle}>
            <Row>
              <Col lg={5}>
                <h3 className={styles.contactSalesText}>CONTACT SALES</h3>
                <h2 className={styles.getInTouch}>
                  Get in <span>touch</span>{" "}
                </h2>
                <p className={styles.formContentStyle}>
                  Our mission is to make construction trust administration and
                  compliance for all parties to the construction industry
                  simple. Speak to our team to get the most out of your
                  integration. We can help you integrate your existing payment
                  application and processes into the required project trust and
                  retention trust accounts to remain compliant with the latest
                  regulations and laws.
                </p>
              </Col>
              <Col lg={1}></Col>
              <Col lg={6}>
                <Form className={styles.formStyleGroup}>
                  <Form.Group className="mb-3" controlId="name">
                    <div className={styles.inputLabelStyle}>
                      <Form.Label>YOUR NAME</Form.Label>
                    </div>
                    <Form.Control
                      className={styles.inputStyles}
                      type="text"
                      placeholder="Enter your name"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="companyname">
                    <div className={styles.inputLabelStyle}>
                      <Form.Label>COMPANY NAME</Form.Label>
                    </div>

                    <Form.Control
                      className={styles.inputStyles}
                      type="text"
                      placeholder="Enter the name of your company"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="yourEmail">
                    <div className={styles.inputLabelStyle}>
                      <Form.Label>YOUR EMAIL</Form.Label>
                    </div>

                    <Form.Control
                      className={styles.inputStyles}
                      type="email"
                      placeholder="Enter your email address"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="message">
                    <div className={styles.inputLabelStyle}>
                      <Form.Label>MESSAGE</Form.Label>
                    </div>

                    <Form.Control
                      className={styles.inputStyles}
                      as="textarea"
                      rows={3}
                      placeholder="Your message"
                    />
                  </Form.Group>
                  <div className={styles.formButtonStyle}>
                    <Button type="submit">Submit</Button>
                  </div>
                </Form>
              </Col>
            </Row>
          </div>
        </Container>
        <div>
          <Footer />
        </div>
      </div>
      <InactivityDetector />
    </div>
  );
};

export default HomePage;
