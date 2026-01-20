import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import userImage from "../../../public/images/avatar.png";
import {
  getFileByAttachmentType,
  triggerActivityLogAfterAnUserIsSignedOut,
} from "@/app/api/commonApi";
import { useTokenDetails } from "@/hooks";
import UseThemeSwitcher from "@/hooks/theme";
import { setAppUserDetails } from "@/redux/slices/userRegistrationSlice";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { clearBrowserStorage, getDecryptedToken } from "@/utils";
import Image from "next/image";
import Link from "next/link";
import { updateUserMode } from "@/redux/slices/userModeSlice";

export function AdminNavBarAccessProfile() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const appUserDetails: any = useAppSelector(
    (state: RootState) => state?.userDetails?.appUserDetails
  );
  const { decodeTokenData } = useTokenDetails();
  const [profileImage, setProfileImage] = useState("");
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Call the service to get file by attachment type
        const imageFile: any = await getFileByAttachmentType("Admin_profile");
        setProfileImage(imageFile);
        dispatch(setAppUserDetails({ ...decodeTokenData, image: imageFile }));
      } catch (error) {
        console.error("Error fetching file:", error);
      }
    };
    fetchData();
  }, []);

  const handleButtonClick = () => {
    if (detailsRef.current) {
      detailsRef.current.removeAttribute("open");
    }
  };

  const { toggleTheme } = UseThemeSwitcher();

  async function onSignOut() {
    const decodedToken: any = getDecryptedToken();
    localStorage.setItem("auth-logout", "true");
    if (decodedToken?.userId) {
      const payload = decodedToken?.isAdmin
        ? {
            admin_id: decodedToken?.userId || null,
          }
        : {
            user_id: decodedToken?.userId || null,
          };
      // Call the service to trigger the activity log
      await triggerActivityLogAfterAnUserIsSignedOut(payload);
    }
    dispatch(updateUserMode(null));
    clearBrowserStorage();
    dispatch(setAppUserDetails({}));
    router.push(AppRoutes.ADMIN_LOGIN);
  }

  return (
    <ul>
      <li className="pt_profiledrop">
        <details className="dropdown avatarbutton" ref={detailsRef}>
          <summary role="button contrast">
            <Image
              src={appUserDetails?.image || profileImage || userImage}
              alt="user-icon"
              width={160}
              height={160}
              unoptimized
              className="avatar useravatar"
            />
            <div className="usernamebox usertopnav">
              <span className="pt_user">
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
              </span>
            </div>
          </summary>
          <ul className="useroptions">
            <div className="useroptionsinner">
              <Link
                href={AppRoutes.ADMIN_DASHBOARD}
                style={{ display: "block" }}
              >
                <button className="contrast dashbtn">
                  <i className="fa-light fa-objects-column"></i>Go to your
                  dashboard
                </button>
              </Link>
              <div className="userblock">
                <div className="currentuser">
                  <div className="usernamebox">
                    <span className="pt_user">
                      {appUserDetails?.userName || decodeTokenData?.userName}
                    </span>
                    <span className="pt_email">
                      {appUserDetails?.emailId || decodeTokenData?.emailId}
                    </span>
                  </div>
                  <div className="themeswitcher">
                    <span
                      data-theme-switcher="dark"
                      className="themeswitch darkswitch"
                      onClick={() => {
                        toggleTheme();
                        handleButtonClick();
                      }}
                    >
                      <i className="fa-light fa-moon"></i>DARK MODE
                    </span>
                    <span
                      data-theme-switcher="light"
                      className="themeswitch lightswitch"
                      onClick={() => {
                        toggleTheme();
                        handleButtonClick();
                      }}
                    >
                      <i className="fa-light fa-sun"></i>LIGHT MODE
                    </span>
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
                      router.push(AppRoutes.ADMIN_PROFILE);
                      handleButtonClick();
                    }}
                  >
                    <i className="fa-light fa-user-pen"></i>Personal Info
                  </button>
                  <button
                    className="secondary icononly"
                    data-tooltip="Security"
                    onClick={() => {
                      router.push(AppRoutes.ADMIN_SECURITY);
                      handleButtonClick();
                    }}
                  >
                    <i className="fa-light fa-lock"></i>
                  </button>
                  <button
                    className="secondary icononly"
                    data-tooltip="Manage Admin Users"
                    onClick={() => {
                      router.push(AppRoutes.ADMIN_USERS_LIST);
                      handleButtonClick();
                    }}
                  >
                    <i className="fa-light fa-users"></i>
                  </button>
                  <button
                    className="secondary icononly"
                    data-tooltip="Manage Admin Groups"
                    onClick={() => {
                      router.push(AppRoutes.GROUPS);
                      handleButtonClick();
                    }}
                  >
                    <i className="fa-light fa-thin fa-people-group"></i>
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
            </div>
          </ul>
        </details>
      </li>
    </ul>
  );
}
