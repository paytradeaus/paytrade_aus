"use client";
import React, { useEffect } from "react";
import styles from "./userDahboardNavbar.module.scss";
import Avatar from "react-avatar";
import { List, CaretDownFill } from "react-bootstrap-icons";

import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { setSidebarFullView } from "@/redux/slices/dashboardSlices";
import Overlays from "../../Overlayes/Overlayes";

import { getCompanyProfilesWithLogos } from "@/app/api/CompanyRegistrationServices";
import { jwtDecode } from "jwt-decode";

import { useSelector } from "react-redux";
import { getFileByAttachmentType } from "@/app/api/commonAPIs";
import { setCookie } from "cookies-next";

import { setAppUserDetails } from "@/redux/slices/userRegistrationDetails";
import { getDecryptedToken } from "@/common/commonFunctions";
import { setUpdatedCompany } from "@/redux/slices/companyDetails";
import UserNavRightSide from "./userNavRightSide";

interface DecodedToken {
  userName: any;
  userId: number;
  emailId: string;
  role: string;
  companySpecificRoles: any[]; // Adjust the type accordingly
  isAdmin: boolean;
}

// Function to decode the access token
const decodeAccessToken = (accessToken: string): DecodedToken | null => {
  try {
    // Decode the access token
    const decodedToken = jwtDecode(accessToken) as DecodedToken;
    return decodedToken;
  } catch (error) {
    console.error("Error decoding access token:", error);
    return null;
  }
};

const UserDashBoardNavBar = () => {
  const dispatch = useAppDispatch();

  const appUserDetails: any = useAppSelector(
    (state: RootState) => state?.userDetails?.appUserDetails
  );

  const updatedCompany: any = useAppSelector(
    (state: RootState) => state.companyStore.updatedcompany
  );

  const { sideBarFullView, hideSearchBarView }: any = useAppSelector(
    (state: RootState) => state.dashBoard
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Call the service to get file by attachment type
        const tokenData = getDecryptedToken();
        const imageFile: any = await getFileByAttachmentType("User_profile");
        dispatch(setAppUserDetails({ ...tokenData, image: imageFile }));
      } catch (error) {
        console.error("Error fetching file:", error);
      }
    };
    fetchData();
  }, []);

  // const handleOverlayClick = () => {
  //   console.log("");
  // };

  // const [companyProfiles, setCompanyProfiles] = useState<any[]>([]); // State to hold company profiles

  // const [currentCompany, setCurrentCompany] = useState<any>(); // State to hold company profiles

  const selectedcompanyid = useSelector(
    (state: RootState) => state.companyStore.companyid
  );

  useEffect(() => {
    const fetchCompanyProfiles = async () => {
      try {
        const storedCompanyId = await localStorage.getItem("companyId");

        const profiles = await getCompanyProfilesWithLogos();
        const companyId =
          selectedcompanyid !== "" ? selectedcompanyid : storedCompanyId;

        const data = profiles?.filter(
          (v: any, i: number) => String(v?.company_id) === String(companyId)
        );
        if (data?.length > 0) {
          // setCurrentCompany(data[0]);
          dispatch(setUpdatedCompany(data[0]));
          setCookie("companyId", Number(companyId));
        } else {
          // setCurrentCompany({});
          const ucId: any = localStorage.getItem("UserCompanyId");
          localStorage.setItem("companyId", ucId?.toString());
          setCookie("companyId", ucId?.toString());

          dispatch(setUpdatedCompany({}));
        }
        // setCompanyProfiles(profiles);
      } catch (error) {
        console.error("Error fetching company profiles:", error);
      }
    };
    fetchCompanyProfiles();
  }, [selectedcompanyid]);

  useEffect(() => {
    // Retrieve the access token from localStorage
    const accessToken = localStorage.getItem("accessToken") || "";
    // const accessToken = "";
    if (accessToken) {
      const tokenData = decodeAccessToken(accessToken);

      dispatch(setAppUserDetails({ ...tokenData, image: "" }));
    }
  }, []);

  const companyNameCallback = async () => {
    try {
      const companyProfiles = await getCompanyProfilesWithLogos();
      return companyProfiles?.length > 0
        ? companyProfiles[0]?.company_name
        : "";
    } catch (error) {
      console.error("Error fetching company name:", error);
      return "";
    }
  };

  return (
    <div className={styles.dashBoardNavCon}>
      <div className={styles.subContainer1}>
        <List
          className={styles.listIconStyles}
          onClick={() => {
            dispatch(setSidebarFullView(!sideBarFullView));
          }}
        />

        {appUserDetails?.userId && (
          <div className={styles.ProfileDropDownStyles}>
            <Overlays
              trigger="click"
              placement={"bottom"}
              overlay={<span></span>}
              popoverTypes={"addbusiness"}
              popoverProfile={{
                name: appUserDetails?.userName,
                email: appUserDetails?.emailId,
                src: appUserDetails?.image || "",
              }}
              getCompanyName={companyNameCallback}
              popperConfig={{
                modifiers: [
                  {
                    name: "offset",
                    options: {
                      offset: [120, 10], // Adjust the offset as needed
                    },
                  },
                ],
              }}
            >
              <div className={styles.flexstyles}>
                <div className={styles.ProfileAvatarStyles}>
                  {updatedCompany?.company_id ? (
                    <Avatar
                      style={{
                        cursor: "pointer",
                        border: "1px solid grey",
                        padding: "2px",
                      }}
                      size={"36"}
                      round="4px"
                      className={styles.sbAvatar}
                      name={updatedCompany?.company_name}
                      src={updatedCompany?.file_path}
                    />
                  ) : (
                    <Avatar
                      style={{ cursor: "pointer" }}
                      size={"36"}
                      round="18px"
                      name={appUserDetails?.userName}
                      src={appUserDetails?.image || ""}
                    />
                  )}
                </div>
                <div style={{ cursor: "pointer" }}>
                  {updatedCompany?.company_id
                    ? updatedCompany?.company_name
                    : appUserDetails
                    ? appUserDetails?.userName
                    : ""}
                </div>
                <div>
                  <CaretDownFill size={12} />
                </div>
              </div>
            </Overlays>
          </div>
        )}
      </div>
      <UserNavRightSide />
    </div>
  );
};
export default UserDashBoardNavBar;
