"use client";
import userImage from "../../../../public/images/avatar.png";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { useEffect, useState } from "react";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { setCookie } from "cookies-next";
import { jwtDecode } from "jwt-decode";
import { setCompanyId } from "@/modules/auth/LoginForm/companyDetails";
import {
  CompanyProfile,
  getCompanyProfilesWithLogos,
} from "@/app/api/adminApi/profileServices";
import { showSuccessToast } from "@/components/Toaster";
import { setCompanyDetails } from "@/redux/slices/companyRegistrationDetails";
import { getFileByAttachmentType } from "@/app/api/commonApi";
import { handleUserActivity } from "@/utils";

export default function SelectProfileForm() {
  const [companyProfiles, setCompanyProfiles] = useState<CompanyProfile[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [profileImage, setProfileImage] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // State to manage search query
  const router = useRouter();
  const dispatch = useAppDispatch();
  const appUserDetails: any = useAppSelector(
    (state: RootState) => state?.userDetails?.appUserDetails
  );
  useEffect(() => {
    const fetchUserData = async () => {
      const accessToken = localStorage.getItem("accessToken");
      if (accessToken) {
        try {
          const decodedToken = jwtDecode(accessToken);
          // Call the service to get file by attachment type
          const imageFile: any = await getFileByAttachmentType("User_profile");
          setProfileImage(imageFile);
          setUserData(decodedToken);
        } catch {}
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

  const handlePersonalProfileClick = () => {
    handleUserActivity();
    const ucId: any = localStorage.getItem("UserCompanyId");
    localStorage.setItem("companyId", ucId?.toString());
    dispatch(setCompanyId(ucId?.toString()));
    setCookie("companyId", ucId?.toString());
    localStorage.setItem("ProfileType", "User");
    setCookie("ProfileType", "User");
    showSuccessToast("Login Successful");
    router.push(AppRoutes.USER_DASHBOARD);
  };

  const handleBusinessProfileClick = (profile: any) => {
    if (profile.status !== "Inactive") {
      handleUserActivity();
      localStorage.setItem("companyId", profile.company_id.toString());
      dispatch(setCompanyId(profile.company_id));
      setCookie("companyId", profile.company_id.toString());
      localStorage.setItem("ProfileType", "Business");
      setCookie("ProfileType", "Business");
      showSuccessToast(`You are in ${profile.company_name} profile now`);
      dispatch(setCompanyDetails({}));

      router.push(AppRoutes.USER_DASHBOARD);
    }
  };

  const filteredProfiles =
    companyProfiles?.filter((profile) =>
      profile.company_name.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? [];
  // Sort profiles so that pending profiles come last
  const sortedProfiles = [...filteredProfiles].sort((a, b) => {
    if (a.status === "Inactive" && b.status !== "Inactive") {
      return 1; // Inactive profile comes after active profile
    }
    if (a.status !== "Inactive" && b.status === "Inactive") {
      return -1; // Inactive profile comes before active profile
    }
    return 0;
  });

  return (
    <div className="pt_centered">
      <div className="pt_centeredinner">
        <div className="pt_box_transparent">
          <div className="grid">
            <div className="pt_login">
              <h4>Select profile</h4>
              <p>Which profile would you like to use today</p>

              <input
                type="search"
                id="search"
                name="search"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <br />
              <div className="pt_profileselect">
                <h6>Personal profile</h6>
                <div className="pt_profilename">
                  <p onClick={handlePersonalProfileClick}>
                    <Image
                      src={profileImage || appUserDetails?.image || userImage}
                      alt="user-icon"
                      width={0}
                      height={0}
                      quality={100}
                      unoptimized
                      className="avatar useravatar"
                    />
                    <div className="usernamebox">
                      <span className="pt_user userSet">
                        {userData ? userData.userName : ""}
                      </span>
                      <span className="pt_email">Personal</span>
                    </div>
                  </p>
                </div>
                {sortedProfiles.length > 0 && (
                  <>
                    <h6>Business profiles</h6>
                    <div
                      className="pt_profilescroll"
                      id="searchprofiles"
                      style={{
                        overflowY:
                          sortedProfiles?.length > 1 ? "scroll" : "unset",
                      }}
                    >
                      {sortedProfiles.map((profile: CompanyProfile, index) => (
                        <div
                          key={index}
                          className={
                            profile.status == "Inactive"
                              ? `pt_profilename cur_not_allowed`
                              : "pt_profilename"
                          }
                          onClick={() => handleBusinessProfileClick(profile)}
                          style={{ lineHeight: "unset" }}
                        >
                          <Image
                            src={profile?.file_path || userImage}
                            alt="user-icon"
                            width={32}
                            height={32}
                            className="avatar useravatar"
                          />
                          <div className="searchOption">
                            <span className="pt_user_customize">
                              <div key={index}>
                                {profile.company_name}
                                {profile.status === "Inactive" && (
                                  <span className="pendingStyle">
                                    {" "}
                                    - Pending
                                  </span>
                                )}
                              </div>
                            </span>
                            <span className="pt_email">Business</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
