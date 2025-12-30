import React, { useEffect, useMemo, useState } from "react";
import styles from "./userDahboardNavbar.module.scss";
import { GearFill, Bell, QuestionCircle, Search } from "react-bootstrap-icons";
import { setHideSearchBarView } from "@/redux/slices/dashboardSlices";
import DropdownLoginSignup from "../navUserSection";
import Overlays from "../../Overlayes/Overlayes";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { ApplicationURLS } from "@/common/applicationURLS";
import { useTokenDetails } from "@/common/commonHooks";
import Avatar from "react-avatar";
import { getCookie, setCookie } from "cookies-next";
import { switchModeOfAnUser } from "@/app/api/LoginServices";
import { updateUserMode } from "@/redux/slices/userModeSlice";
import { AppModal } from "@/components/model/model";
import { getFileByAttachmentType } from "@/app/api/commonAPIs";
import {
  getCompanyIdFromCookies,
  getDecryptedToken,
} from "@/common/commonFunctions";
import { setAppUserDetails } from "@/redux/slices/userRegistrationDetails";
import _ from "lodash";
import { USER_PRIMARY_ADMIN } from "@/common/constants/roles";

export default function UserNavRightSide() {
  const dispatch = useAppDispatch();

  const companyDetails: any = useAppSelector(
    (state: RootState) => state.companyStore?.companyid
  );

  const { hideSearchBarView }: any = useAppSelector(
    (state: RootState) => state.dashBoard
  );

  const appUserDetails: any = useAppSelector(
    (state: RootState) => state?.userDetails?.appUserDetails
  );

  const { decodeTokenData } = useTokenDetails();

  const updatedCompany: any = useAppSelector(
    (state: RootState) => state.companyStore.updatedcompany
  );

  const [companyId, setCompanyId] = useState<number | null>(null);
  const [userType, setUserType] = useState<string>();
  const [openModal, setOpenModal] = useState<boolean>(false);

  const [userMode, setUserMode] = useState<string>();
  const [isOptionAvail, setIsOptionAvail] = useState<any>([]);
  // Update options when roleAccess changes

  const updateOptions = () => {
    const newOptions = [
      { value: "Privacy", url: ApplicationURLS.PRIVACY_POLICY },
      { value: "Cookies", url: ApplicationURLS.COOKIES_POLICY },
      ...(roleAccess?.role === "PRIMARY ADMIN" &&
      roleAccess?.isSystemAdded === false
        ? [{ value: "Manage profile", url: `/user/edit-business` }]
        : []),
      { value: "Switch profile", url: "/user/select-profile" },
      ...(roleAccess?.manageUser !== "No" ||
      roleAccess?.role === "PRIMARY ADMIN"
        ? [{ value: "Manage users", url: "/company/user-access" }]
        : []),
      displaySubscriptions() && {
        value: "Manage Subscriptions",
        url: ApplicationURLS.USER_MANAGE_SUBSCRIPTIONS,
      },
      {
        value:
          userMode === "Normal"
            ? "Switch to Onboarding mode"
            : "Switch to Normal mode",
        url: "",
        onClick: handleModeSwitchClick,
      },
    ].filter(Boolean); // Remove falsy values
    setIsOptionAvail(newOptions);
  };

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
    const tokenData: any = getDecryptedToken();
    if (
      (_.isEmpty(appUserDetails) || !appUserDetails?.image) &&
      tokenData?.userId
    ) {
      fetchUserImage();
    }
  }, []);

  async function fetchUserImage() {
    try {
      // Call the service to get file by attachment type
      const tokenData: any = getDecryptedToken();
      const imageFile: any = await getFileByAttachmentType(
        tokenData?.isAdmin ? "Admin_profile" : "User_profile"
      );

      dispatch(setAppUserDetails({ ...tokenData, image: imageFile }));
    } catch (error) {
      console.error("Error fetching file:", error);
    }
  }

  const handleModeSwitch = async () => {
    try {
      const newMode = userMode === "Normal" ? "Onboarding" : "Normal";

      const response = await switchModeOfAnUser(
        appUserDetails?.userId,
        newMode,
        getCompanyIdFromCookies()
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

  const roleDetails = decodeTokenData?.companySpecificRoles?.filter(
    (x: { companyId: number }) => String(x.companyId) === String(companyId)
  );

  const [roleAccess, setRoleAccess] = useState<any>(
    roleDetails?.length > 0 ? roleDetails?.[0] : {}
  );

  useEffect(() => {
    if (roleAccess) {
      updateOptions();
    }
  }, [roleAccess, userType, userMode]);

  useEffect(() => {
    let storedCompanyId: any = localStorage.getItem("companyId");
    if (storedCompanyId) {
      storedCompanyId = parseInt(storedCompanyId, 10); // Parse string to integer
    }
    const newData = decodeTokenData?.companySpecificRoles?.filter(
      (x: { companyId: number }) =>
        String(x.companyId) === String(storedCompanyId)
    );
    setRoleAccess(newData?.length > 0 ? newData?.[0] : {});
  }, [companyId, companyDetails]);

  const handleModeSwitchClick = () => {
    setOpenModal(true);
  };

  const handleConfirm = () => {
    setOpenModal(false);
    handleModeSwitch();
  };

  function displaySubscriptions() {
    if (roleAccess?.role === USER_PRIMARY_ADMIN) {
      return true;
    } else {
      return false;
    }
  }

  const popoverOptions = [
    {
      heading: "PROFILE",
      elements: true
        ? isOptionAvail
        : [
            { value: "Privacy", url: ApplicationURLS.PRIVACY_POLICY },
            { value: "Cookies", url: ApplicationURLS.COOKIES_POLICY },
            ...(roleAccess?.role === "PRIMARY ADMIN" &&
            roleAccess?.isSystemAdded === false
              ? [{ value: "Manage profile", url: `/user/edit-business` }]
              : []),
            { value: "Switch profile", url: "/user/select-profile" },
            ...((roleAccess?.manageUser !== "No" ||
              roleAccess?.role === "PRIMARY ADMIN") &&
            userType !== "User"
              ? [{ value: "Manage users", url: "/company/user-access" }]
              : []),
            displaySubscriptions() && {
              value: "Manage Subscriptions",
              url: ApplicationURLS.USER_MANAGE_SUBSCRIPTIONS,
            },
            {
              value:
                userMode === "Normal"
                  ? "Switch to Onboarding mode"
                  : "Switch to Normal mode",
              url: "",
              onClick: handleModeSwitchClick,
            },
          ],
    },
  ];

  const modalBodyContent =
    userMode === "Normal" ? (
      <>
        Would you like to onboard an existing account.This will temporarily turn
        off all email functions related to reporting and all notices will be
        automatically marked as sent. Once completed, you will need to turn this
        feature off and mark onboarding as completed.
      </>
    ) : (
      <>Please confirm you have completed onboarding your account?</>
    );

  const modalHeading =
    userMode === "Normal" ? "Switch To Onboarding Mode" : "Complete Onboarding";

  return (
    <div className={styles.subContainer2}>
      <DropdownLoginSignup displayLogin={false} />
      <div className={styles.showHelpTextCon}>
        <Overlays
          trigger="click"
          placement={"bottom-end"}
          overlay={<span></span>}
          popoverTypes={"help"}
        >
          {() => (
            <span className={styles.helpIconCon}>
              <QuestionCircle className={styles.iconStyles} />
              Help
            </span>
          )}
        </Overlays>
      </div>
      <div className={styles.showSearchIconStyles}>
        <Search
          className={styles.searchIconStyle}
          onClick={() => {
            dispatch(setHideSearchBarView(!hideSearchBarView));
          }}
        />
      </div>
      {/* <Bell className={styles.iconStyles} /> */}
      <Overlays
        trigger="click"
        placement={"bottom-end"}
        popoverOptions={popoverOptions}
        overlay={<span></span>}
        popoverTypes={"list"}
        popperConfig={{
          modifiers: [
            {
              name: "offset",
              options: {
                offset: [15, 10], // Adjust the offset as needed
              },
            },
          ],
        }}
      >
        <GearFill className={styles.iconStyles} />
      </Overlays>
      {appUserDetails && appUserDetails?.userName && (
        <Overlays
          trigger="click"
          placement={"bottom-end"}
          popoverProfile={{
            name: appUserDetails?.userName,
            email: appUserDetails?.emailId,
            src: appUserDetails?.image || "",
          }}
          overlay={<span></span>}
          popoverTypes={"profile"}
          navBarType="user"
        >
          {() => (
            <Avatar
              style={{ cursor: "pointer" }}
              size={"36"}
              round="18px"
              name={appUserDetails && appUserDetails?.userName}
              src={appUserDetails && appUserDetails?.image}
            />
          )}
        </Overlays>
      )}
      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        firstButtonLabel="Yes"
        secondButtonLabel="No"
        modalHeading={modalHeading}
        modalBodyTitle=""
        modalBodyContent={modalBodyContent}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
