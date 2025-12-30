"use client";
import React, { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PersonCircle } from "react-bootstrap-icons";
import { Button, Col, Container, Placeholder, Row } from "react-bootstrap";
import customStyles from "./personalInfo.module.scss";

import { NO_DATA_PLACEHOLDER } from "@/common/constants/general";
import { formatDate } from "@/common/commonFunctions";
import { GetAdminDetailsById } from "../../addAdminUser/addAdminUser.functions";
import { SUPER_ADMIN_ROLE } from "@/common/constants/roles";
import { useTokenDetails } from "@/common/commonHooks";

interface PersonalInfoProps {
  onEdit: () => void;
  adminUUID: string;
}

export default function PersonalInfo({
  onEdit,
  adminUUID,
}: Readonly<PersonalInfoProps>) {
  const router = useRouter();
  const { decodeTokenData } = useTokenDetails();
  const [userData, setUserData] = useState<any>({});
  const [displaySkeletonLoader, setDisplaySkeletonLoader] = useState(false);
  useEffect(() => {
    (async () => {
      const payload: any = {
        id: adminUUID || "",
      };
      setDisplaySkeletonLoader(true);
      const resUserData = await GetAdminDetailsById(
        payload,
        setDisplaySkeletonLoader
      );
      if (resUserData?.id) {
        setUserData(resUserData);
      } else {
        setUserData({});
      }
    })();
  }, []);

  //render Template
  //  {
  //               "admin_role": "PORTAL ADMIN",
  //               "admin_status": "Active",
  //               "created_on": "2024-09-12T06:12:43.358Z",
  //               "email_id": "super@paytrade.com",
  //               "first_name": "Paytrade",
  //               "groupIds": [
  //                   "a292709e-cf93-4c1f-b179-cf4ec90e25f6"
  //               ],
  //               "id": "a0fd5882-61c9-4009-9c55-aa3c0b7309d5",
  //               "last_logged_in": "2024-09-27T05:51:24.584Z",
  //               "last_name": "Admin",
  //               "__typename": "PTAdminGroup"
  //           }
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
              <div className={customStyles.key}>First Name</div>
              {displaySkeletonLoader ? (
                <SkeletonLoader />
              ) : (
                <div className={customStyles.value}>
                  {userData?.first_name || ""}
                </div>
              )}
            </div>
            <hr className={customStyles.horizontalLine} />
          </Fragment>
          <Fragment>
            <div className={customStyles.dataRow}>
              <div className={customStyles.key}>Last Name</div>
              {displaySkeletonLoader ? (
                <SkeletonLoader />
              ) : (
                <div className={customStyles.value}>
                  {userData?.last_name || ""}
                </div>
              )}
            </div>
            <hr className={customStyles.horizontalLine} />
          </Fragment>
          {userData?.signature && (
            <div className={customStyles.dataRow2}>
              <p className={customStyles.InfoTextStyle}>
                Delegated authority signature
              </p>
              <div
                className={customStyles.imageContainer}
                // onClick={() => setDisplaySignature(true)}
              >
                {userData?.signature && (
                  <Image
                    width={0}
                    height={0}
                    // src={imageUrl}
                    src={userData?.signature || ""}
                    alt="Uploaded"
                    style={{
                      objectFit: "contain",
                      width: "100%",
                      height: "100%",
                    }}
                  />
                )}
              </div>
            </div>
          )}
          {/* <Fragment>
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
          </Fragment> */}
          <div className="d-flex justify-content-center mt-4">
            <Button
              className={`${customStyles.button} ${customStyles.closeButton}`}
              onClick={() => router.back()}
            >
              Close
            </Button>
            {userData?.id && (
              <Button className={customStyles.button} onClick={() => onEdit()}>
                Edit
              </Button>
            )}
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
