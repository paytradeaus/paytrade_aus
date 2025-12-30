"use client";
import React, { useEffect, useState } from "react";
import styles from "./selectProfile.module.scss";
import FormButton from "@/components/Button/button";
import TextField from "@/components/TextField/textField";
import {
  CompanyProfile,
  getCompanyProfilesWithLogos,
} from "@/app/api/CompanyRegistrationServices";
import { jwtDecode } from "jwt-decode";
import { useRouter } from "next/navigation";
import { setCompanyId } from "@/redux/slices/companyDetails";
import { useAppDispatch } from "@/redux/store";
import { setCookie } from "cookies-next";
import { ApplicationURLS } from "@/common/applicationURLS";
import { triggerActivityLogWhileSwitchingBusinessProfile } from "../chooseProfile/chooseProfile.functions";
import { getDecryptedToken } from "@/common/commonFunctions";

// we are not using any where we can delete this file

// we are not using any where we can delete this file

// we are not using any where we can delete this file

// we are not using any where we can delete this file

// we are not using any where we can delete this file

// we are not using any where we can delete this file

// we are not using any where we can delete this file

// we are not using any where we can delete this file

export const SelectProfilePage = () => {
  const [companyProfiles, setCompanyProfiles] = useState<CompanyProfile[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const router = useRouter();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const fetchUserData = async () => {
      const accessToken = localStorage.getItem("accessToken");
      if (accessToken) {
        try {
          const decodedToken = jwtDecode(accessToken);
          setUserData(decodedToken);
        } catch (error) {
          console.error("Error decoding access token:", error);
        }
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    getCompanyProfilesWithLogos()
      .then((profiles: CompanyProfile[]) => {
        setCompanyProfiles(profiles);
      })
      .catch((error) => {
        // Handle error
        console.error("Error fetching company profiles:", error);
      });
  }, []);

  const handleDetailClick = (index: any) => {
    setSelectedDetail(index);
  };

  const handlePersonalProfileClick = async () => {
    const ucId: any = localStorage.getItem("UserCompanyId");
    localStorage.setItem("companyId", ucId?.toString());
    dispatch(setCompanyId(ucId?.toString()));
    setCookie("companyId", ucId?.toString());
    localStorage.setItem("ProfileType", "User");
    setCookie("ProfileType", "User");
    const decodedToken: any = getDecryptedToken();

    // Call the service to trigger the activity log
    const payload = {
      company_id: Number(ucId) || null,
    };
    const success = await triggerActivityLogWhileSwitchingBusinessProfile(
      payload
    );
    router.push("/user/dashboard");
  };

  const handleBusinessProfileClick = async (profile: any) => {
    if (profile?.status !== "Inactive") {
      localStorage.setItem("companyId", profile?.company_id.toString());
      dispatch(setCompanyId(profile?.company_id));
      setCookie("companyId", profile?.company_id.toString());
      localStorage.setItem("ProfileType", "Business");
      setCookie("ProfileType", "Business");
      const decodedToken: any = getDecryptedToken();

      // Call the service to trigger the activity log
      const payload = {
        company_id: profile?.company_id || null,
      };
      const success = await triggerActivityLogWhileSwitchingBusinessProfile(
        payload
      );
      router.push("/user/dashboard");
    }
  };

  const handleCancelClick = () => {
    router.push("/"); // Send the user back to the previous page
  };

  // Sort profiles so that pending profiles come last
  const sortedProfiles = [...companyProfiles].sort((a, b) => {
    if (a.status === "Inactive" && b.status !== "Inactive") {
      return 1; // Inactive profile comes after active profile
    }
    if (a.status !== "Inactive" && b.status === "Inactive") {
      return -1; // Inactive profile comes before active profile
    }
    return 0;
  });

  return (
    <>
      <div className={styles.mainConatianer}>
        <h4 className={styles.headingStyles}>Select Profile</h4>
        <h5 className={styles.personalProfileHeading}>Personal Profile</h5>
        <p
          className={`${styles.detailsStyles}`}
          onClick={handlePersonalProfileClick}
        >
          {userData?.userName?.length > 75
            ? userData.userName.slice(0, 75) + "..."
            : userData?.userName || ""}
        </p>
        {sortedProfiles.length > 0 && (
          <>
            <h5 className={styles.businessProfileHeading}>Business Profiles</h5>
            <div className={styles.businessProfilesContainer}>
              {sortedProfiles.map((profile: CompanyProfile, index) => (
                <div
                  key={index}
                  className={`${styles.detailsStyles} ${
                    profile.status === "Inactive" ? styles.inactiveProfile : ""
                  }`}
                  onClick={() => handleBusinessProfileClick(profile)}
                  style={{
                    pointerEvents:
                      profile.status === "Inactive" ? "none" : "auto",
                    marginRight: "10px",
                  }}
                >
                  {profile?.company_name?.length > 75
                    ? profile.company_name.slice(0, 75) + "..."
                    : profile?.company_name || ""}
                  {profile.status === "Inactive" && (
                    <span className={styles.pendingText}>Pending</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <button
        onClick={handleCancelClick}
        className={styles.PreviousButtonStyles}
      >
        Close
      </button>
    </>
  );
};
