//default imports
"use client";
import React, { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
//import from reactstrap components and icons
import { PersonCircle } from "react-bootstrap-icons";
import { Button, Col, Container, Placeholder, Row } from "react-bootstrap";
//import from customized components
import customStyles from "./personalInfo.module.scss";

import { fetchPersonalInfo } from "./personalInfo.function";
import { NO_DATA_PLACEHOLDER } from "@/common/constants/general";
import { formatDate } from "@/common/commonFunctions";

declare global {
  interface Window {
    CookieConsent: any;
  }
}

//import customized styles
//import from external libraries
//import from constants, interfaces ,functions and services
//module level constants and interfaces
interface PersonalInfoProps {
  onEdit: () => void;
}

export default function PersonalInfo({ onEdit }: Readonly<PersonalInfoProps>) {
  //useState and useEffect Management
  const [userData, setUserData] = useState<any>({});
  const [displaySkeletonLoader, setDisplaySkeletonLoader] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (window.CookieConsent) {
        clearInterval(interval);
      } else {
        console.warn("CookieConsent is not available yet.");
      }
    }, 700);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    getPersonalInfo();
  }, []);
  //other Hooks
  const router = useRouter();
  //Formik Handling

  //functions

  async function getPersonalInfo() {
    setDisplaySkeletonLoader(true);
    await fetchPersonalInfo()
      .then((data: any) => {
        if (data?.length) {
          setUserData(data[0]);
        }
      })
      .catch((err: any) => console.log("🚀 ~ handleSubmit ~ err:", err))
      .finally(() => setDisplaySkeletonLoader(false));
  }

  //render Template
  return (
    <Container fluid>
      <Row className="justify-content-center">
        <Col className={customStyles.card}>
          {userData?.file && (
            <div className={customStyles?.profileIcon}>
              <Image
                src={userData?.file}
                alt="profile"
                width={70}
                height={70}
                className={customStyles?.profileImage}
              />
            </div>
          )}{" "}
          {userData?.first_name && !userData?.file && (
            <PersonCircle className={customStyles?.profileIcon} />
          )}
          <h5 className={customStyles.title}>Personal Info</h5>
          <div className={customStyles.subText}>
            Change the info we use to personalise your products.
          </div>
          <Fragment>
            <hr className={customStyles.horizontalLine} />
            <div className={customStyles.dataRow}>
              <div className={customStyles.key}>Name</div>
              {displaySkeletonLoader ? (
                <SkeletonLoader />
              ) : (
                <div className={customStyles.value}>
                  {(userData?.first_name || "") +
                    " " +
                    (userData?.last_name || "")}
                </div>
              )}
            </div>
            <hr className={customStyles.horizontalLine} />
          </Fragment>
          <Fragment>
            <div className={customStyles.dataRow}>
              <div className={customStyles.key}>Date of birth</div>
              {displaySkeletonLoader ? (
                <SkeletonLoader />
              ) : (
                <div className={customStyles.value}>
                  {userData?.date_of_birth
                    ? formatDate(userData?.date_of_birth)
                    : NO_DATA_PLACEHOLDER}
                </div>
              )}
            </div>
            <hr className={customStyles.horizontalLine} />
          </Fragment>
          <Fragment>
            <div className={customStyles.dataRow}>
              <div className={customStyles.key}>Position</div>
              {displaySkeletonLoader ? (
                <SkeletonLoader />
              ) : (
                <div className={customStyles.value}>
                  {userData?.position_title ?? NO_DATA_PLACEHOLDER}
                </div>
              )}
            </div>
            <hr className={customStyles.horizontalLine} />
          </Fragment>
          <Fragment>
            <div className={customStyles.dataRow}>
              <div className={customStyles.key}>Occupation</div>
              {displaySkeletonLoader ? (
                <SkeletonLoader />
              ) : (
                <div className={customStyles.value}>
                  {userData?.occupation ?? NO_DATA_PLACEHOLDER}
                </div>
              )}
            </div>
            <hr className={customStyles.horizontalLine} />
          </Fragment>
          <Fragment>
            <div className={customStyles.dataRow}>
              <div className={customStyles.key}>Address</div>
              {displaySkeletonLoader ? (
                <SkeletonLoader />
              ) : (
                <div className={customStyles.value}>
                  {userData?.user_address || NO_DATA_PLACEHOLDER}
                </div>
              )}
            </div>
            <hr className={customStyles.horizontalLine} />
          </Fragment>
          <Fragment>
            <div className={customStyles.dataRow}>
              <div className={customStyles.key}>Phone</div>
              {displaySkeletonLoader ? (
                <SkeletonLoader />
              ) : (
                <div className={customStyles.value}>
                  {userData?.user_phone_no || NO_DATA_PLACEHOLDER}
                </div>
              )}
            </div>
            <hr className={customStyles.horizontalLine} />
            {userData?.signature && (
              <>
                <div className="d-flex flex-column align-items-center">
                  <p className={customStyles.InfoTextStyle}>Signature</p>
                  <div className={customStyles.imageContainer}>
                    <Image
                      width={0}
                      height={0}
                      // src={imageUrl}
                      src={userData?.signature ?? ""}
                      alt="Uploaded"
                      style={{
                        objectFit: "contain",
                        width: "100%",
                        height: "100%",
                      }}
                    />
                  </div>
                  <hr className={customStyles.horizontalLine} />
                </div>
                <hr className={customStyles.horizontalLine} />
              </>
            )}
          </Fragment>
          <div className={customStyles.dataRow}>
            <div className={customStyles.key}>Manage Cookies</div>
            <Button
              className={`${customStyles.button} ${customStyles.cookiePreferencesButton}`}
              onClick={() => {
                if (
                  window.CookieConsent &&
                  typeof window.CookieConsent.show === "function"
                ) {
                  window.CookieConsent.show();
                } else {
                  console.warn(
                    "CookieConsent or show method is not available yet."
                  );
                }
              }}
            >
              Update
            </Button>
          </div>
          <hr className={customStyles.horizontalLine} />
          <div className="d-flex justify-content-center mt-4">
            <Button
              className={`${customStyles.button} ${customStyles.closeButton}`}
              onClick={() => router.back()}
            >
              Close
            </Button>
            <Button className={customStyles.button} onClick={() => onEdit()}>
              Edit
            </Button>
          </div>
        </Col>
      </Row>
    </Container>
  );
}

function SkeletonLoader() {
  return (
    <Placeholder
      xs={7}
      size="sm"
      // bg="secondary"
      animation="wave"
      as="p"
      className={customStyles.placeHolderSpacing}
    />
  );
}
