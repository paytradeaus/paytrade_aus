"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Col, Container, Row } from "react-bootstrap";
import { BuildingsFill } from "react-bootstrap-icons";
import customStyles from "./viewBusinessProfile.module.scss";
import { RootState, useAppSelector } from "@/redux/store";
import {
  CompanyProfile,
  getCompanyProfilesWithLogos,
  requestToJoinCompany,
} from "@/app/api/CompanyRegistrationServices";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import "react-toastify/dist/ReactToastify.css";
import { formatDate } from "@/common/commonFunctions";
import { useLoaderContext } from "@/context/useLoader";
import { fetchBusinessDetails } from "../editBusinessDetails/editBusinessDetails.function";

export default function ViewBusinessProfile() {
  const [companyProfiles, setCompanyProfiles] = useState<CompanyProfile[]>([]);
  const [requestedCount, setRequestedCount] = useState<number>(0);
  const [isJoinButtonDisabled, setIsJoinButtonDisabled] =
    useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const { loader, setLoader }: any = useLoaderContext();
  const [businessDetails, setBusinessDetails] = useState<any>(null);
  const importCompanyId: any = useSearchParams().get("comp_id");
  const importScreen = useSearchParams().get("screen");

  const router = useRouter();
  const businessInfo: any = useAppSelector(
    (state: RootState) => state.companyDetails?.businessInfo
  );

  const fetchCompanyProfiles = async () => {
    try {
      const profiles = await getCompanyProfilesWithLogos();
      const filteredProfiles = profiles?.filter(
        (profile: any) => profile?.company_id == businessInfo?.companyId
      );
      setCompanyProfiles(filteredProfiles);

      if (filteredProfiles?.length > 0) {
        const profile = filteredProfiles[0];
        if (profile.status === "Active") {
          let joinedDate = formatDate(profile.joined_on);
          setErrorMessage("Joined since" + " " + joinedDate);
          setIsJoinButtonDisabled(true);
        } else if (profile.status === "Inactive") {
          const lastSent = formatDate(profile.last_sent_on);
          setErrorMessage(`Last join request sent on: ${lastSent}`);
        }
      }
    } catch (error) {
      console.error("Error fetching company profiles:", error);
    }
  };

  const fetchBusinessDetailsById = async (companyId: number) => {
    setLoader(true); // Start the loader
    try {
      // Fetch the business details using the company ID
      const businessDetails = await fetchBusinessDetails(companyId);

      // If business details are fetched successfully, set them in the state
      if (businessDetails) {
        setBusinessDetails(businessDetails);
      } else {
        return null; // Return null if the response is not as expected
      }
    } catch (error) {
      console.error("Error fetching business details:", error);
      return null; // Return null in case of an error
    } finally {
      setLoader(false); // Stop the loader after the operation
    }
  };

  useEffect(() => {
    fetchCompanyProfiles();
    fetchBusinessDetailsById(Number(importCompanyId));
  }, []);

  const handleJoinClick = async () => {
    const currentDate = new Date();
    const utcDate = currentDate.toISOString();
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      var decodedToken: any = jwtDecode(accessToken);
      try {
        const data = {
          user_name: decodedToken["userName"],
          user_id: decodedToken["userId"],
          company_id:
            importScreen === "import"
              ? Number(importCompanyId)
              : businessInfo?.companyId,
          is_user_exists: true,
          email_id: decodedToken["emailId"],
          user_first_name: decodedToken["userFirstName"],
          manage_user: "No",
          manage_subscription: "No",
          manage_project_trust_payment: "No",
          manage_company: "No",
          company_role: "STANDARD USER",
        };
        const response = await requestToJoinCompany(data);
        if (response) {
          toast.success(`Join request sent successfully! (${response}/3)`);
          router.push("/user/dashboard");
        }
      } catch (error) {
        setErrorMessage(
          "Please contact the business administrator to join their business."
        );
        setIsJoinButtonDisabled(true);
        console.error("Error joining the company:", error);
      }
    }
  };

  return (
    <>
      <Row className="justify-content-center mt-5 gy-3">
        <Col className={customStyles.card} xs={12}>
          <BuildingsFill className={customStyles?.headerIcon} />
          <h5 className={customStyles.title}>Business Profile</h5>

          <div className={customStyles.row}>
            <div className={customStyles.dataRow}>
              <h5 className={customStyles.subHeading}>Business info</h5>
            </div>
          </div>

          <hr className={customStyles.horizontalLine} />

          <Row className="w-100">
            <Col className="col-lg-5">
              <div className={customStyles.profileHead}>Name</div>
            </Col>
            <Col className="col-lg-7 text-break d-flex align-items-center">
              <div className={customStyles.value}>
                {businessDetails
                  ? businessDetails?.company_name
                  : businessInfo?.name}
              </div>
            </Col>
          </Row>
          <hr className={customStyles.horizontalLine} />

          <Row className="w-100">
            {businessInfo?.businessName && (
              <>
                <Col className="col-lg-5">
                  <div className={customStyles.profileHead}>Business name</div>
                </Col>
                <Col className="col-lg-7 text-break d-flex align-items-center">
                  <div className={customStyles.value}>
                    {businessDetails
                      ? businessDetails?.legal_company_name
                      : businessInfo?.businessName}
                  </div>
                </Col>
                <hr className={customStyles.horizontalLine} />
              </>
            )}

            <Row className="w-100">
              <Col className="col-lg-5">
                <div className={customStyles.profileHead}>Entity type</div>
              </Col>
              <Col className="col-lg-7 text-break d-flex align-items-center">
                <div className={customStyles.value2}>
                  {businessDetails
                    ? businessDetails?.entity_type
                    : businessInfo?.type}
                </div>
              </Col>
            </Row>
            <hr className={customStyles.horizontalLine} />

            <Row className="w-100">
              <Col className="col-lg-5">
                <div className={customStyles.profileHead}>Address</div>
              </Col>
              <Col className="col-lg-7 text-break d-flex align-items-center">
                <div className={customStyles.value3}>
                  {businessDetails
                    ? businessDetails?.company_address
                    : businessInfo?.address}
                </div>
              </Col>
            </Row>
          </Row>
        </Col>
        <Col xs={12} className={customStyles.btnAlignStyles}>
          {errorMessage && (
            <div className={customStyles.errorMessage}>{errorMessage}</div>
          )}
          <div>
            {" "}
            <Button
              className={customStyles.PreviousButtonStyles}
              disabled={isJoinButtonDisabled}
              onClick={handleJoinClick}
            >
              Join
            </Button>
          </div>
          <div>
            <Button
              className={customStyles.cancelButton}
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </Col>
      </Row>
    </>
  );
}
