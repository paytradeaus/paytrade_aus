//default imports
"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Col, Container, Row } from "react-bootstrap";
//import from reactstrap components
import { ChevronRight, PersonLock } from "react-bootstrap-icons";
//import from customized components
import customStyles from "./signInAndSecurity.module.scss";

import { ApplicationURLS } from "@/common/applicationURLS";
import { fetchPersonalInfo } from "./signInAndSecurity.function";
import { NO_DATA_PLACEHOLDER } from "@/common/constants/general";
import { getCookie } from "cookies-next";
import { jwtDecode } from "jwt-decode";
//import customized styles
//import from external libraries
//import from constants, interfaces ,functions and services
//module level constants and interfaces

export default function SignInAndSecurity() {
  //useState and useEffect Management
  const [userInfo, setUserInfo] = useState<any>(null);
  useEffect(() => {
    getPersonalInfo();
  }, []);
  //Other Hooks
  const router = useRouter();
  //Formik Handling

  //Functions
  async function getPersonalInfo() {
    // Extract the authentication token from cookies
    const authToken: any = localStorage.getItem("accessToken");
    // Decrypt the authentication token
    const decryptedToken: any = authToken ? jwtDecode(authToken) : "";
    await fetchPersonalInfo({
      emailId: decryptedToken?.emailId,
    })
      .then((data: any) => {
        const token = localStorage.getItem("accessToken") ?? "";

        if (data?.length) {
          const response = data[0];
          setUserInfo(response);
        }
      })

      .catch((err: any) => console.log("~ handleSubmit ~ err:", err));
  }

  //Render Template
  return (
    <Container fluid>
      <Row className="justify-content-center">
        <Col className={customStyles.card} xs={12}>
          <PersonLock className={customStyles?.headerIcon} />
          <h5 className={customStyles.title}>Sign In & Security</h5>
          <div onClick={() => router.push(ApplicationURLS.USER_CHANGE_EMAIL)}>
            <hr className={customStyles.horizontalLine} />
            <div className={customStyles.row}>
              <div className={customStyles.dataRow}>
                <div className={customStyles.key}>Email address</div>
                <div className={customStyles.value}>{userInfo?.email_id}</div>
                <span
                  className={
                    userInfo?.is_verified
                      ? customStyles?.emailStatus
                      : `${customStyles?.emailStatus} ${customStyles?.disabledEmailStatus}`
                  }
                >
                  {userInfo?.is_verified === true
                    ? "Verified"
                    : userInfo?.is_verified === false
                    ? "Not Verified"
                    : ""}
                </span>
              </div>
              <ChevronRight className={customStyles.editIcon} />
            </div>
            <hr className={customStyles.horizontalLine} />
          </div>
          <div
            className={customStyles.row}
            onClick={() => router.push(ApplicationURLS.USER_CHANGE_PASSWORD)}
          >
            <div className={customStyles.dataRow}>
              <div className={customStyles.key}>Password</div>
              <div className={customStyles.value}>*********</div>
            </div>
            <ChevronRight className={customStyles.editIcon} />
          </div>
        </Col>
        <Col xs={12} className="d-flex justify-content-center">
          <Button
            className="cancel-button"
            onClick={() => router.push(ApplicationURLS.USER_DASHBOARD)}
          >
            Close
          </Button>
        </Col>
      </Row>
    </Container>
  );
}
