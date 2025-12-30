"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Col, Container, Row } from "react-bootstrap";
import { ChevronRight, PersonLock } from "react-bootstrap-icons";
import customStyles from "./emailAndPasswordHome.module.scss";

import { ApplicationURLS } from "@/common/applicationURLS";
import { getCookie } from "cookies-next";
import { jwtDecode } from "jwt-decode";
import { useTokenDetails } from "@/common/commonHooks";
import ChangePassword from "./changePassword/changePassword";

type SCREEN_TYPE = "mainScreen" | "passwordScreen";

export default function EmailAndPasswordHome() {
  const { decodeTokenData } = useTokenDetails();
  const [screenType, SetScreenType] = useState<SCREEN_TYPE>("mainScreen");

  const router = useRouter();

  const renderScreensBasedOnType = () => {
    switch (screenType) {
      case "mainScreen":
        return (
          <Row className="justify-content-center">
            <Col className={customStyles.card} xs={12}>
              <PersonLock className={customStyles?.headerIcon} />
              <h5 className={customStyles.title}>Sign In & Security</h5>
              <div onClick={() => {}}>
                <hr className={customStyles.horizontalLine} />
                <div className={customStyles.row}>
                  <div
                    className={customStyles.dataRow}
                    onClick={() =>
                      router.push(ApplicationURLS.ADMIN_AUTHENTICATE_EMAIL)
                    }
                  >
                    <div className={customStyles.key}>Email address</div>
                    <div className={customStyles.value}>
                      {decodeTokenData?.emailId}
                    </div>
                    <span className={customStyles?.emailStatus}>
                      Verified
                      {/* {userInfo?.is_verified === true
                    ? "Verified"
                    : userInfo?.is_verified === false
                    ? "Not Verified"
                    : ""} */}
                    </span>
                  </div>
                  <ChevronRight className={customStyles.editIcon} />
                </div>
                <hr className={customStyles.horizontalLine} />
              </div>
              <div
                className={customStyles.row}
                onClick={() => SetScreenType("passwordScreen")}
              >
                <div className={customStyles.dataRow}>
                  <div className={customStyles.key}>Password</div>
                  <div className={customStyles.value}>*********</div>
                </div>
                <ChevronRight className={customStyles.editIcon} />
              </div>
            </Col>
            <Col xs={12} className="d-flex justify-content-center">
              <Button className="cancel-button" onClick={() => router.back()}>
                Close
              </Button>
            </Col>
          </Row>
        );
      case "passwordScreen":
        return <ChangePassword SetScreenType={SetScreenType} />;
      default:
        return <div>Invalid Screen Type</div>;
    }
  };

  return <Container fluid>{renderScreensBasedOnType()}</Container>;
}
