import React, { useEffect, useState, useRef, Fragment, useMemo } from "react";
import Image from "next/image";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { useTokenDetails } from "@/hooks";
import {
  CompanyProfile,
  getCompanyProfilesWithLogos,
} from "@/app/api/adminApi/profileServices";
import userImage from "../../../public/images/avatar.png";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { useRouter } from "next/navigation";
import useThemeSwitcher from "@/hooks/theme";
import {
  clearBrowserStorage,
  getCompanyIdFromStorage,
  getDecryptedToken,
} from "@/utils";
import { getCookie, setCookie } from "cookies-next";
import { setCompanyId, setUpdatedCompany } from "@/redux/slices/companyDetails";
import { useSelector } from "react-redux";
import { jwtDecode } from "jwt-decode";
import { showSuccessToast } from "../Toaster";
import { updateUserMode } from "@/redux/slices/userModeSlice";
import { switchModeOfAnUser } from "@/modules/auth/ForgotPassword/forgorPasswordFunction";
import BaseModal from "../BaseModal";
import {
  setAppUserDetails,
  setUserDetails,
} from "@/redux/slices/userRegistrationSlice";
import {
  triggerActivityLogAfterAnUserIsSignedOut,
  triggerActivityLogWhileSwitchingBusinessProfile,
} from "@/app/api/commonApi";
import { setCompanyDetails } from "@/redux/slices/companyRegistrationDetails";
import ScrollableText from "../ScrollableText";

const getImageSrc = (src: any, cacheKey: number): any => {
  if (!src) return null;
  if (typeof src !== 'string') return src;
  if (src.startsWith('data:')) return src;
  if (src.startsWith('http')) return src;
  if (src.startsWith('/') && !src.includes('?')) {
    return `${src}?t=${cacheKey}`;
  }
  return src;
};

export default function NavbarAccessProfile() {
  const appUserDetails: any = useAppSelector(
    (state: RootState) => state?.userDetails?.appUserDetails
  );

  const updatedCompany: any = useAppSelector(
    (state: RootState) => state?.companyStore?.updatedcompany
  );

  const dispatch = useAppDispatch();

  const router = useRouter();

  const { decodeTokenData } = useTokenDetails();

  const { toggleTheme } = useThemeSwitcher();

  const [companyProfiles, setCompanyProfiles] = useState<CompanyProfile[]>([]);
  const [viewProfile, setViewProfile] = useState("");
  const [userData, setUserData] = useState<any>(null);
  const [reorderedProfiles, setReorderedProfiles] = useState<any>([]);
  const [imageCacheKey] = useState(() => Date.now());

  const [searchQuery, setSearchQuery] = useState(""); // State to manage search query
  const detailsRef = useRef<HTMLDetailsElement>(null); // Ref to the <details> element
  const [userMode, setUserMode] = useState<string>();
  const [userType, setUserType] = useState<string>();
  const [openModal, setOpenModal] = useState<boolean>(false);

  const companyDetails: any = useAppSelector(
    (state: RootState) => state.companyStore?.companyid
  );

  const selectedCompanyId = useSelector(
    (state: RootState) => state?.companyStore?.companyid
  );
  const activeProfileStatus = useSelector(
    (state: RootState) => state.companyStore.isActiveProfileUpdated
  );

  const modalHeading =
    userMode === "Normal" ? "Switch To Onboarding Mode" : "Complete Onboarding";

  const modalBodyContent =
    userMode === "Normal" ? (
      <div style={{ padding: "1rem", lineHeight: "1.5" }}>
        <p>
          Would you like to onboard an existing account? This will temporarily
          turn off all email functions related to reporting, and all notices
          will be automatically marked as sent.
        </p>
        <p>
          Once completed, you will need to turn this feature off and mark
          onboarding as completed.
        </p>
      </div>
    ) : (
      <div style={{ padding: "1rem", textAlign: "center", fontWeight: "500" }}>
        <p>Please confirm you have completed onboarding your account?</p>
      </div>
    );

  useEffect(() => {
    // Fetch company ID from local storage
    const storedCompanyId = localStorage.getItem("companyId");
    if (storedCompanyId) {
      setCompanyId(parseInt(storedCompanyId, 10)); // Parse string to integer
    }

    // Get the user mode from local storage or cookies
    const storedUserMode =
      localStorage.getItem("userMode") || getCookie("userMode");
    if (storedUserMode === "Onboarding" || storedUserMode === "Normal") {
      setUserMode(storedUserMode);
    }

    const profileType: any = localStorage.getItem("ProfileType");
    setUserType(profileType);
  }, [companyDetails]);

  useEffect(() => {
    getCompanyProfilesWithLogos()
      .then((profiles) => {
        setCompanyProfiles(profiles);
      })
      .catch((error) => {
        // Handle error
        console.error("Error fetching business profiles:", error);
      });
  }, [updatedCompany]);

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    fetchCompanyProfiles();
  }, [selectedCompanyId, activeProfileStatus]);

  useEffect(() => {
    const profileType = localStorage.getItem("ProfileType");
    if (profileType === "User" && appUserDetails?.image) {
      setViewProfile(appUserDetails.image);
    }
  }, [appUserDetails?.image]);

  async function fetchUserData() {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      try {
        const decodedToken = jwtDecode(accessToken);
        setUserData(decodedToken);
      } catch (error) {
        console.error("Error decoding access token:", error);
      }
    }
  }

  async function fetchCompanyProfiles() {
    try {
      const storedCompanyId = getCompanyIdFromStorage();

      const profiles = await getCompanyProfilesWithLogos();

      const companyId =
        selectedCompanyId !== "" ? selectedCompanyId : storedCompanyId;

      const data = profiles?.filter(
        (v: any, i: number) => String(v?.company_id) === String(companyId)
      );

      if (data?.length > 0) {
        dispatch(setUpdatedCompany(data[0]));
        setViewProfile(data[0].file_path);
        setCookie("companyId", Number(companyId));
      } else {
        const ucId: any = localStorage.getItem("UserCompanyId");
        localStorage.setItem("companyId", ucId?.toString());
        setCookie("companyId", ucId?.toString());
        setViewProfile(appUserDetails.image);
        dispatch(setUpdatedCompany({}));
      }
    } catch (error) {
      console.error("Error fetching business profiles:", error);
    }
  }

  useEffect(() => {
    let personalData = {
      file_path: appUserDetails?.image,
      company_name: appUserDetails?.userName,
      status: "Active",
      isPersonalProfile: true,
    };

    if (Array.isArray(companyProfiles) && companyProfiles.length > 0) {
      const activeProfiles = companyProfiles.filter(
        (profile) => profile.status !== "Inactive"
      );
      const inactiveProfiles = companyProfiles.filter(
        (profile) => profile.status === "Inactive"
      );
      setReorderedProfiles([
        personalData,
        ...activeProfiles,
        ...inactiveProfiles,
      ]);
    } else {
      setReorderedProfiles([personalData]);
    }
  }, [companyProfiles, appUserDetails?.image, appUserDetails?.userName]);

  const handleButtonClick = () => {
    if (detailsRef.current) {
      detailsRef.current.removeAttribute("open");
    }
  };

  const decodedToken: any = getDecryptedToken();

  async function onSignOut() {
    if (decodedToken?.userId) {
      const normalpayload = decodedToken?.isAdmin
        ? {
            admin_id: decodedToken?.userId || null,
          }
        : {};

      const proxypayload = {
        user_id: decodedToken?.userId || null,
        admin_id: decodedToken?.admin_id || null,
      };

      const payload =
        decodedToken?.logged_in_by === "ADMIN" ? proxypayload : normalpayload;
      // Call the service to trigger the activity log
      await triggerActivityLogAfterAnUserIsSignedOut(payload);
    }
    // Check if admin session exists in sessionStorage
    const adminSession = sessionStorage.getItem("adminSession");

    if (adminSession) {
      // Parse the stored admin session
      const { accessToken, accessVerification } = JSON.parse(adminSession);

      // Decode the token to check its expiration
      const decodedToken = jwtDecode(accessToken);
      const currentTime = Date.now() / 1000; // Current time in seconds

      if (decodedToken?.exp && decodedToken?.exp > currentTime) {
        // Token is valid, restore admin session details
        localStorage.setItem("accessToken", accessToken);
        setCookie("accessVerification", accessVerification);
        // Restore any other relevant session details

        // Clear the admin session from sessionStorage
        sessionStorage.clear();

        // Redirect to the admin dashboard
        router.push(AppRoutes.ADMIN_DASHBOARD);
      } else {
        // Token has expired, redirect to the admin login page
        localStorage.setItem("auth-logout", "true");
        sessionStorage.clear();
        router.push(AppRoutes.ADMIN_LOGIN);
      }
    } else {
      // No admin session, redirect to the home page
      // Clear user session details
      localStorage.setItem("auth-logout", "true");
      clearBrowserStorage();
      dispatch(updateUserMode(null));
      dispatch(setAppUserDetails({}));
      dispatch(setUserDetails({}));
      dispatch(setCompanyDetails({}));
      router.push(AppRoutes.HOME);
    }
    // Refresh the router to apply changes
    router.refresh();
  }

  const handlePersonalProfileClick = async () => {
    // 🧹 Remove xeroIntegrationId if it exists
    if (localStorage.getItem("xeroIntegrationId")) {
      localStorage.removeItem("xeroIntegrationId");
    }
    const ucId: any = localStorage.getItem("UserCompanyId");
    localStorage.setItem("companyId", ucId?.toString());
    dispatch(setCompanyId(ucId?.toString()));
    setCookie("companyId", ucId?.toString());
    localStorage.setItem("ProfileType", "User");
    setCookie("ProfileType", "User");
    showSuccessToast(`You are in personal profile now`);
    // Call the service to trigger the activity log
    const payload = {
      company_id: Number(ucId) || null,
    };
    const success = await triggerActivityLogWhileSwitchingBusinessProfile(
      payload
    );
    router.push(AppRoutes.USER_DASHBOARD);
    handleButtonClick();
  };

  const handleAvatarClick = async (profile: any) => {
    // 🧹 Remove xeroIntegrationId if it exists
    if (localStorage.getItem("xeroIntegrationId")) {
      localStorage.removeItem("xeroIntegrationId");
    }
    localStorage.setItem("companyId", profile.company_id.toString());
    setCookie("companyId", profile.company_id);
    dispatch(setCompanyId(profile.company_id));
    localStorage.setItem("ProfileType", "Business");
    setCookie("ProfileType", "Business");
    showSuccessToast(`You are in ${profile?.company_name} profile now`);
    // Call the service to trigger the activity log
    const payload = {
      company_id: profile?.company_id || null,
    };
    const success = await triggerActivityLogWhileSwitchingBusinessProfile(
      payload
    );
    router.push(AppRoutes.USER_DASHBOARD);
    handleButtonClick();
  };

  function routeToDashboard() {
    router.push(AppRoutes.USER_DASHBOARD);
    handleButtonClick();
  }

  const filteredProfiles =
    reorderedProfiles?.filter((profile: any) =>
      profile?.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? [];

  const handleModeSwitch = async () => {
    const companyId = Number(getCookie("companyId")) || "";

    try {
      const newMode = userMode === "Normal" ? "Onboarding" : "Normal";

      const response = await switchModeOfAnUser(
        appUserDetails?.userId,
        newMode,
        +companyId
      );

      if (response?.status === "SUCCESS") {
        setUserMode(newMode);
        localStorage.setItem("userMode", newMode);
        setCookie("userMode", newMode);
        dispatch(updateUserMode(newMode));
      } else {
        console.error(
          "Failed to switch mode:",
          response?.message || "Unknown error"
        );
      }
    } catch (error) {
      console.error("Failed to switch mode:", error);
    }
  };

  const handleModeSwitchClick = () => {
    setOpenModal(true);
    handleButtonClick();
  };

  const handleConfirm = () => {
    setOpenModal(false);
    handleModeSwitch();
  };

  return (
    <Fragment>
      <ul className="navSubmenuLapping">
        <li className="pt_profiledrop">
          <details className="dropdown avatarbutton" ref={detailsRef}>
            <summary role="button contrast">
              <Image
                src={getImageSrc(viewProfile, imageCacheKey) || getImageSrc(appUserDetails?.image, imageCacheKey) || userImage}
                alt="user-icon"
                width={0}
                height={0}
                quality={100}
                unoptimized
                className="avatar useravatar"
              />
              <div className="usernamebox usertopnav">
                <ScrollableText
                  text={
                    updatedCompany?.company_name ||
                    appUserDetails?.userName ||
                    decodeTokenData?.userName ||
                    ""
                  }
                  className="pt_user"
                />

                <ScrollableText
                  text={
                    updatedCompany?.company_email_id ||
                    appUserDetails?.emailId ||
                    decodeTokenData?.emailId ||
                    ""
                  }
                  className="pt_email"
                />
              </div>
            </summary>
            <ul className="useroptions">
              <div className="useroptionsinner">
                <a style={{ display: "block" }}>
                  <button
                    className="contrast dashbtn"
                    onClick={routeToDashboard}
                  >
                    <i className="fa-light fa-objects-column"></i>Go to your
                    dashboard
                  </button>
                </a>
                <div className="userblock">
                  <div className="currentuser">
                    <div className="usernamebox">
                      {/* <span className="pt_user">
                        {appUserDetails?.userName
                          ? appUserDetails.userName.length > 24
                            ? appUserDetails.userName.slice(0, 22) + ".."
                            : appUserDetails.userName
                          : decodeTokenData?.userName
                          ? decodeTokenData.userName.length > 24
                            ? decodeTokenData.userName.slice(0, 22) + ".."
                            : decodeTokenData.userName
                          : ""}
                      </span>
                      <span className="pt_email">
                        {appUserDetails?.emailId
                          ? appUserDetails.emailId.length > 24
                            ? appUserDetails.emailId.slice(0, 22) + ".."
                            : appUserDetails.emailId
                          : decodeTokenData?.emailId
                          ? decodeTokenData.emailId.length > 24
                            ? decodeTokenData.emailId.slice(0, 22) + ".."
                            : decodeTokenData.emailId
                          : ""}
                      </span> */}
                      <div className="usernamebox">
                        <ScrollableText
                          text={
                            appUserDetails?.userName ||
                            decodeTokenData?.userName ||
                            ""
                          }
                          className="pt_user"
                        />

                        <ScrollableText
                          text={
                            appUserDetails?.emailId ||
                            decodeTokenData?.emailId ||
                            ""
                          }
                          className="pt_email"
                        />
                      </div>
                    </div>
                    <div className="themeswitcher">
                      <a
                        data-theme-switcher="dark"
                        className="themeswitch darkswitch"
                        onClick={() => {
                          toggleTheme();
                          handleButtonClick();
                        }}
                      >
                        <i className="fa-light fa-moon"></i>DARK MODE
                      </a>
                      <a
                        data-theme-switcher="light"
                        className="themeswitch lightswitch"
                        onClick={() => {
                          toggleTheme();
                          handleButtonClick();
                        }}
                      >
                        <i className="fa-light fa-sun"></i>LIGHT MODE
                      </a>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "4px",
                      padding: "8px 0px 5px",
                    }}
                  >
                    <button
                      className="secondary"
                      onClick={() => {
                        handleButtonClick();
                        router.push(AppRoutes.USER_PROFILE);
                      }}
                    >
                      <i className="fa-light fa-user-pen"></i>Edit account info
                    </button>
                    <button
                      className="secondary icononly"
                      data-tooltip="Security"
                      onClick={() => {
                        handleButtonClick();
                        router.push(AppRoutes.USER_SECURITY);
                      }}
                    >
                      <i className="fa-light fa-lock"></i>
                    </button>

                    <button
                      className="secondary icononly"
                      data-tooltip="Add business profile"
                      onClick={() => {
                        handleButtonClick();
                        router.push(AppRoutes.USER_MATCH_BUSINESS_PROFILE);
                      }}
                    >
                      <i className="fa-light fa-square-plus"></i>
                    </button>

                    <button
                      className="secondary icononly"
                      data-tooltip="Sign out"
                      onClick={() => {
                        onSignOut();
                        handleButtonClick();
                      }}
                    >
                      <i className="fa-light fa-right-from-bracket"></i>
                    </button>
                  </div>
                </div>
                <h6>Active Profile</h6>
                <div className="userblock">
                  <div className="pt_profileboxactive">
                    <div className="pt_profilename">
                      <Image
                        src={getImageSrc(viewProfile, imageCacheKey) || userImage}
                        alt="user-icon"
                        width={0}
                        height={0}
                        unoptimized
                        className="avatar"
                      />
                      <div className="usernamebox setBlock">
                        {/* <span className="pt_user">
                          {updatedCompany?.company_id
                            ? updatedCompany?.company_name
                            : userData
                            ? userData.userName
                            : ""}
                        </span>
                        <span className="pt_email">
                          {" "}
                          {updatedCompany?.company_id ? "Business" : "Personal"}
                        </span> */}
                        <ScrollableText
                          text={
                            updatedCompany?.company_id
                              ? updatedCompany.company_name
                              : userData?.userName || ""
                          }
                          className="pt_user"
                        />
                        <span className="pt_email">
                          {updatedCompany?.company_id ? "Business" : "Personal"}
                        </span>
                      </div>
                    </div>
                    {updatedCompany?.company_id && (
                      <button
                        className="secondary"
                        style={{ marginRight: "8px" }}
                        onClick={() => {
                          handleButtonClick();
                          router.push(AppRoutes.USER_EDIT_BUSINESS_PROFILE);
                        }}
                      >
                        <i className="fa-light fa-pen-to-square"></i>Edit
                        profile
                      </button>
                    )}
                    <button
                      className="secondary"
                      onClick={() => {
                        handleButtonClick();
                        router.push(AppRoutes.USER_ACCESS);
                      }}
                    >
                      <i className="fa-light fa-users"></i>
                      Manage users
                    </button>
                  </div>
                </div>

                <h6 style={{ marginBottom: "0px" }}>Switch Profile</h6>

                <input
                  id="searchprofilesinput"
                  placeholder="Search profiles"
                  type="text"
                  name="searchprofilesinput"
                  value={searchQuery}
                  onChange={(e) =>
                    setSearchQuery(
                      e?.target?.value.trim()
                        ? e?.target?.value
                        : e?.target?.value.trim()
                    )
                  }
                />

                <div
                  className="pt_profilescroll"
                  id="searchprofiles"
                  style={{
                    overflowY:
                      filteredProfiles?.length > 2 ? "scroll" : "unset",
                  }}
                >
                  {filteredProfiles?.map(
                    (profile: CompanyProfile, index: number) => (
                      <div
                        key={index}
                        onClick={() => {
                          if (profile.status !== "Inactive") {
                            {
                              profile.isPersonalProfile
                                ? handlePersonalProfileClick()
                                : handleAvatarClick(profile);
                            }
                          }
                        }}
                      >
                        <div
                          className={
                            profile.status == "Inactive"
                              ? `pt_profilename cur_not_allowed`
                              : "pt_profilename"
                          }
                        >
                          <Image
                            src={getImageSrc(profile?.file_path, imageCacheKey) || userImage}
                            alt="user-icon"
                            width={0}
                            height={0}
                            quality={100}
                            unoptimized
                            data-name={
                              userData
                                ? userData.userName.length > 30
                                  ? userData.userName.slice(0, 28) + ".."
                                  : userData.userName
                                : ""
                            }
                            className="avatar"
                          />
                          <div className="usernamebox setBlock">
                            {/* <span className="pt_user_customize  profileNameBox">
                              {profile?.company_name.length > 30
                                ? profile?.company_name.slice(0, 33) + "..."
                                : profile?.company_name}
                            </span> */}
                            <ScrollableText
                              text={profile.company_name}
                              className="pt_user_customize profileNameBox"
                            />
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span className="pt_email">
                                {profile?.isPersonalProfile
                                  ? "Personal"
                                  : "Business"}
                              </span>
                              {profile?.status === "Inactive" && (
                                <span className="pt_email"> - Pending</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                  {searchQuery && filteredProfiles?.length === 0 && (
                    <p
                      style={{
                        textWrap: "wrap",
                        lineHeight: "15px",
                        fontSize: "smaller",
                        margin: "10px 0px",
                      }}
                    >
                      No matching businesses found, you can add a new business
                      profile.
                    </p>
                  )}
                </div>
                <button
                  className="onboarding contrast"
                  style={{ marginTop: "0.45rem" }}
                  onClick={handleModeSwitchClick}
                >
                  {userMode === "Normal"
                    ? "Switch to Onboarding mode"
                    : "Switch to Normal mode"}
                </button>
              </div>
            </ul>
          </details>
        </li>
      </ul>
      {openModal && (
        <BaseModal
          displayModal={openModal}
          onClose={() => setOpenModal(false)}
          secondButtonName="Yes"
          firstButtonName="No"
          title={modalHeading}
          onConfirm={() => {
            handleConfirm();
            return true;
          }}
        >
          <div>{modalBodyContent}</div>
        </BaseModal>
      )}
    </Fragment>
  );
}
