"use client";
import React, { useEffect, useRef, useState } from "react";
import styles from "./navbar.module.scss";
import Avatar from "react-avatar";
import {
  GearFill,
  Bell,
  QuestionCircle,
  List,
  Search,
} from "react-bootstrap-icons";
import TextField from "../TextField/textField";

import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import {
  setSidebarFullView,
  setHideSearchBarView,
} from "@/redux/slices/dashboardSlices";
import Overlays from "../Overlayes/Overlayes";
import { ApplicationURLS } from "@/common/applicationURLS";
import { useTokenDetails } from "@/common/commonHooks";
import { setAppUserDetails } from "@/redux/slices/userRegistrationDetails";
import { getFileByAttachmentType } from "@/app/api/commonAPIs";

const popoverOptions = [
  {
    heading: "ACCESS",
    elements: [
      { value: "Manage Admin Users", url: ApplicationURLS.ADMIN_USERS_LIST },
      { value: "Manage Admin Groups", url: ApplicationURLS.GROUPS },
    ],
  },
  // {
  //   heading: "PROFILE",
  //   elements: [
  //     { value: "Privacy", url: "" },
  //     { value: "Cookies", url: "" },
  //     { value: "Switch company", url: "" },
  //   ],
  // },
];

const popoverProfile = {
  name: "Philip Taylor",
  email: "phil.taylor@carmaukconstruction.co.uk",
};

const DashBoardNavBar = () => {
  const dispatch = useAppDispatch();
  const { sideBarFullView, hideSearchBarView } = useAppSelector(
    (state: RootState) => state.dashBoard
  );
  const appUserDetails: any = useAppSelector(
    (state: RootState) => state?.userDetails?.appUserDetails
  );

  const { decodeTokenData } = useTokenDetails();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Call the service to get file by attachment type
        const imageFile: any = await getFileByAttachmentType("Admin_profile");
        dispatch(setAppUserDetails({ ...decodeTokenData, image: imageFile }));
      } catch (error) {
        console.error("Error fetching file:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className={styles.dashBoardNavCon}>
      <div className={styles.subContainer1}>
        <List
          className={styles.listIconStyles}
          onClick={() => {
            dispatch(setSidebarFullView(!sideBarFullView));
          }}
        />
        <div className={styles.showTextFieldRange}>
          <TextField
            placeholder="Search"
            endingData={<Search />}
            endingDataStyles={styles.endIconStyle}
            classNames={styles.inputFieldControl}
          />
        </div>
      </div>
      <div className={styles.subContainer2}>
        <span className={styles.userRoleText}> Pay Trade Admin</span>
        <div className={styles.showHelpTextCon}>
          <Overlays
            trigger="click"
            placement={"bottom-end"}
            overlay={<span></span>}
            popoverTypes={"help"}
          >
            <span className={styles.helpIconCon}>
              <QuestionCircle className={styles.iconStyles} />
              Help
            </span>
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
        {/* <Bell className={styles.iconStyles} title="Notifications" /> */}
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
          <GearFill className={styles.iconStyles} title="Settings" />
        </Overlays>
        <Overlays
          trigger="click"
          placement={"bottom-end"}
          popoverProfile={{
            name: appUserDetails?.userName || decodeTokenData?.userName,
            email: appUserDetails?.emailId || decodeTokenData?.emailId,
            src: appUserDetails?.image || "",
          }}
          overlay={<span></span>}
          popoverTypes={"profile"}
          navBarType="admin"
        >
          <Avatar
            title={appUserDetails?.userName || decodeTokenData?.userName || ""}
            style={{ cursor: "pointer" }}
            size={"36"}
            round="18px"
            facebook-id="invalidfacebookusername"
            name={appUserDetails?.userName || decodeTokenData?.userName || ""}
            src={appUserDetails && appUserDetails?.image}
          />
        </Overlays>
      </div>
    </div>
  );
};
export default DashBoardNavBar;
