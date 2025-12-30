"use client";
import React, { Fragment, ReactNode, useEffect, useRef, useState } from "react";
import {
  Button,
  Col,
  OverlayTrigger,
  OverlayTriggerProps,
  Placeholder,
  Popover,
  Row,
  Tooltip,
} from "react-bootstrap";
import styles from "./Overlayes.module.scss";
import Avatar from "react-avatar";
import FormButton from "../Button/button";
import { OverlayTriggerRenderProps } from "react-bootstrap/esm/OverlayTrigger";
import { useRouter } from "next/navigation";
import { clearALLCookies, getDecryptedToken } from "@/common/commonFunctions";
import { ApplicationURLS } from "@/common/applicationURLS";
import { AppModal } from "../model/model";
import Link from "next/link";
import {
  CompanyProfile,
  getCompanyProfilesWithLogos,
} from "@/app/api/CompanyRegistrationServices";
import { jwtDecode } from "jwt-decode";
import { setCompanyId } from "@/redux/slices/companyDetails";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { usePathname } from "next/navigation";
import { useTokenDetails } from "@/common/commonHooks";

import { setAppUserDetails } from "@/redux/slices/userRegistrationDetails";
import { deleteCookie, setCookie } from "cookies-next";
import { updateUserMode } from "@/redux/slices/userModeSlice";
import { triggerActivityLogAfterAnUserIsSignedOut } from "@/app/api/commonAPIs";
import { useLoaderContext } from "@/context/useLoader";
import { triggerActivityLogWhileSwitchingBusinessProfile } from "@/container/chooseProfile/chooseProfile.functions";
interface overlaysProps extends OverlayTriggerProps {
  popoverOptions?: Array<any>;
  popoverActions?: Array<{
    label: string;
    value: string;
    isDelete?: boolean;
    disable?: boolean;
  }>;
  popoverProfile?: {
    name: string;
    email?: string;
    src?: any;
  };
  popoverTypes?:
    | "list"
    | "help"
    | "profile"
    | "custom"
    | "tableList"
    | "tableMarkList"
    | "projectTableList"
    | "projectArchiveList"
    | "contentFaqList"
    | "addList"
    | "addbusiness"
    | "addcompany"
    | "invitationList"
    | "trustTableList"
    | "info"
    | "tableActions"
    | "tooltip"
    | "adduser";

  customPopupstyles?: any;
  optionClick?: (value: any) => void;
  cellData?: string | number | any;
  navBarType?: "user" | "admin";
  getCompanyName?: () => Promise<string>;
  isLoading?: boolean;
}

const Overlays = (props: overlaysProps) => {
  const {
    children,
    trigger,
    overlay,
    popoverOptions,
    popoverTypes,
    popoverProfile,
    customPopupstyles,
    optionClick,
    cellData,
    getCompanyName,
    popoverActions,
    navBarType,
    isLoading,
    ...rest
  } = props;

  const [showPopover, setShowPopover] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [companyName, setCompanyName] = useState<string>("");
  const [companyProfiles, setCompanyProfiles] = useState<CompanyProfile[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const pathname = usePathname();
  const { decodeTokenData } = useTokenDetails();
  const [role, setRole] = useState<String>("");
  const [allowedAccess, setAllowedAccess] = useState<String>("");
  const companyDetails: any = useAppSelector(
    (state: RootState) => state.companyStore
  );
  const { tabId }: any = useLoaderContext();

  let companyID: any;
  if (typeof localStorage !== "undefined") {
    companyID = Number(localStorage.getItem("companyId"));
  } else {
    // Handle the case where localStorage is not available
    companyID = 0; // Or any default value you prefer
  }
  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      companyID = Number(localStorage.getItem("companyId"));
    } else {
      // Handle the case where localStorage is not available
      companyID = 0; // Or any default value you prefer
    }
  }, [companyDetails]);

  useEffect(() => {
    const getCurrentComapny = decodeTokenData?.companySpecificRoles?.filter(
      (x: { companyId: number }) => x.companyId === companyID
    );
    const getRole =
      (getCurrentComapny?.length && getCurrentComapny[0]?.role) || "";
    setRole(getRole);
    const getAccessPermission =
      (getCurrentComapny?.length && getCurrentComapny[0]?.manageUser) || "";
    setAllowedAccess(getAccessPermission);
  }, [companyID, decodeTokenData]);
  const dispatch = useAppDispatch();

  const router = useRouter();

  const overlayRef = useRef(null);

  const handleClickOutside = (event: any) => {
    if (
      overlayRef.current &&
      !(overlayRef.current as HTMLElement).contains(event.target)
    ) {
      setShowPopover(false);
    }
  };

  useEffect(() => {
    const handleClickOutsideListener = (event: any) =>
      handleClickOutside(event);
    document.addEventListener("click", handleClickOutsideListener);

    return () => {
      document.removeEventListener("click", handleClickOutsideListener);
    };
  }, [overlayRef]);

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
    if (popoverTypes === "addbusiness" || pathname.includes("dashboard")) {
      getCompanyProfilesWithLogos()
        .then((profiles) => {
          setCompanyProfiles(profiles);
        })
        .catch((error) => {
          // Handle error
          console.error("Error fetching company profiles:", error);
        });
    }
  }, [popoverTypes, pathname]);

  const [reorderedProfiles, setReorderedProfiles] = useState<any>([]);

  useEffect(() => {
    if (Array.isArray(companyProfiles) && companyProfiles.length > 0) {
      const activeProfiles = companyProfiles.filter(
        (profile) => profile.status !== "Inactive"
      );
      const inactiveProfiles = companyProfiles.filter(
        (profile) => profile.status === "Inactive"
      );
      setReorderedProfiles([...activeProfiles, ...inactiveProfiles]);
    }
  }, [companyProfiles]);

  const handlePopoverToggle = () => {
    setShowPopover(!showPopover);
  };

  const handleAddNewClick = () => {
    router.push("/user/add-company");
  };

  const handleAvatarClick = async (profile: any) => {
    localStorage.setItem("companyId", profile.company_id.toString());
    setCookie("companyId", profile.company_id);
    dispatch(setCompanyId(profile.company_id));
    localStorage.setItem("ProfileType", "Business");
    setCookie("ProfileType", "Business");
    // router.push("/company/user-access");
    const decodedToken: any = getDecryptedToken();

    // Prepare the payload for the API call
    const payload = {
      company_id: profile?.company_id || null,
    };

    // Trigger the activity log API
    const success = await triggerActivityLogWhileSwitchingBusinessProfile(
      payload
    );
    router.push("/user/dashboard");
  };

  const handleUserAvatarClick = async (profile: any) => {
    const ucId: any = localStorage.getItem("UserCompanyId");
    localStorage.setItem("companyId", ucId?.toString());
    setCookie("companyId", ucId?.toString());
    localStorage.setItem("ProfileType", "User");
    setCookie("ProfileType", "User");
    dispatch(setCompanyId(ucId?.toString()));
    // localStorage.setItem("companyId", profile.company_id.toString());
    // Fetch the decrypted token
    const decodedToken: any = getDecryptedToken();

    // Prepare the payload for the API call
    const payload = {
      company_id: Number(ucId) || null,
    };

    // Trigger the activity log API
    const success = await triggerActivityLogWhileSwitchingBusinessProfile(
      payload
    );
    router.push("/user/dashboard");
  };

  async function signOut() {
    const decodedToken: any = getDecryptedToken();

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
    clearALLCookies();
    new BroadcastChannel("auth-channel").postMessage({ type: "LOGOUT", tabId });
    router.push(ApplicationURLS.HOME);
    dispatch(setAppUserDetails({}));
    dispatch(updateUserMode(null));
  }

  const handleOptionsClick = (e: any, each: any) => {
    if (each?.disable) {
      document.removeEventListener("click", () => {});
      e.stopPropagation(); // Prevent further propagation of the click event
    } else {
      optionClick &&
        optionClick({
          ...props?.cellData,
          id: props?.cellData?.id,
          status: props?.cellData?.status,
          option: each?.value,
        });
    }
  };

  const renderFunctionLayout = (props: overlaysProps) => {
    switch (popoverTypes) {
      case "help":
        return (
          <Popover id={`popover-positioned`} className={styles.helpContainer}>
            <div className={styles.helpContainer}>
              <Link href={ApplicationURLS.FAQ} className={styles.overrideLink}>
                FAQ
              </Link>
              <Link
                href={ApplicationURLS.CONTACT_US}
                className={styles.overrideLink}
              >
                Contact Pay Trade
              </Link>
            </div>
          </Popover>
        );

      case "tooltip":
        return (
          <Tooltip
            id={`popover-positioned`}
            className={styles.toolTipContainer}
          >
            {props?.cellData?.message}
          </Tooltip>
        );

      case "list":
        return (
          <Popover
            id={`popover-positioned`}
            className={`${styles.popoverStyle} ${styles.popover} ${customPopupstyles}`}
          >
            <Popover.Body className={styles.popoverBodyStyles}>
              {popoverOptions?.map((section, index) => {
                return (
                  <>
                    <div key={section?.heading} className={styles.eachSection}>
                      <span className={styles.listHeading}>
                        {section.heading}
                      </span>
                      <ul className={styles.listElements}>
                        {section?.elements.map((element: any) => (
                          <Link
                            key={element.value}
                            className={styles.eachListElement}
                            href={
                              element.value === "Manage profile"
                                ? element?.url + `/${companyID}`
                                : element?.url || ""
                            }
                            onClick={() => {
                              element?.onClick && element?.onClick();
                              setShowPopover(false);
                            }}
                          >
                            {element.value}
                          </Link>
                        ))}
                      </ul>
                    </div>
                    {index !== popoverOptions.length - 1 && (
                      <div className={styles.sectionSeparator} />
                    )}
                  </>
                );
              })}
            </Popover.Body>
          </Popover>
        );
      case "projectTableList":
        return (
          <Popover
            id={`popover-positioned`}
            className={`${styles.tableListCon} ${styles.popover} ${customPopupstyles}`}
          >
            <ul className={styles.popoverElementsList}>
              <div className={styles.tableOptionsCon}>
                <span
                  className={`  ${styles.cursor2}`}
                  onClick={() =>
                    optionClick &&
                    optionClick({
                      id: props?.cellData?.id,
                      option: "View",
                      name: props?.cellData?.name,
                      companyID: props?.cellData?.companyID,
                    })
                  }
                >
                  View
                </span>

                <span
                  className={`  ${styles.cursor2}`}
                  onClick={() =>
                    optionClick &&
                    optionClick({
                      id: props?.cellData?.id,
                      option: "Edit",
                      name: props?.cellData?.name,
                      companyID: props?.cellData?.companyID,
                    })
                  }
                >
                  Edit
                </span>

                <span
                  className={`  ${styles.cursor2}`}
                  onClick={() =>
                    optionClick &&
                    optionClick({
                      id: props?.cellData?.id,
                      option: "Completed",
                      name: props?.cellData?.name,
                      companyID: props?.cellData?.companyID,
                    })
                  }
                >
                  Completed
                </span>

                <span
                  className={`  ${styles.cursor2}`}
                  onClick={() =>
                    optionClick &&
                    optionClick({
                      id: props?.cellData?.id,
                      option: "Deleted",
                      name: props?.cellData?.name,
                      companyID: props?.cellData?.companyID,
                    })
                  }
                >
                  Deleted
                </span>
              </div>
              <div className={styles.tableSeparator} />
            </ul>
          </Popover>
        );

      case "addList":
        return (
          <Popover
            id={`popover-positioned`}
            className={`${styles.tableListCon} ${styles.popover} ${customPopupstyles}`}
          >
            <ul className={styles.popoverElementsList}>
              <div className={styles.tableOptionsCon}>
                <span
                  className={`  ${styles.cursor3}`}
                  onClick={() =>
                    optionClick &&
                    optionClick({
                      id: props?.cellData?.id,
                      option: "View",
                      name: props?.cellData?.name,
                      companyID: props?.cellData?.companyID,
                    })
                  }
                >
                  Update Transaction List
                </span>

                <span
                  className={`  ${styles.cursor3}`}
                  onClick={() =>
                    optionClick &&
                    optionClick({
                      id: props?.cellData?.id,
                      option: "Edit",
                      name: props?.cellData?.name,
                      companyID: props?.cellData?.companyID,
                    })
                  }
                >
                  Add Bank Statement
                </span>

                <span
                  className={`  ${styles.cursor3}`}
                  onClick={() =>
                    optionClick &&
                    optionClick({
                      id: props?.cellData?.id,
                      option: "Completed",
                      name: props?.cellData?.name,
                      companyID: props?.cellData?.companyID,
                    })
                  }
                >
                  Add Interest/Charge
                </span>
              </div>
              <div className={styles.tableSeparator} />
            </ul>
          </Popover>
        );

      case "projectArchiveList":
      case "contentFaqList":
        return (
          <Popover
            id={`popover-positioned`}
            className={`${styles.tableListCon} ${styles.popover} ${customPopupstyles}`}
          >
            <ul className={styles.popoverElementsList}>
              <div className={styles.tableOptionsCon}>
                <span
                  className={`  ${styles.cursor2}`}
                  onClick={() => {
                    optionClick &&
                      optionClick({
                        id: props?.cellData?.id,
                        option: "View",
                        name: props?.cellData?.name,
                        companyID: props?.cellData?.companyID,
                      });
                    setShowPopover(false);
                  }}
                >
                  View
                </span>
              </div>
              <div className={styles.tableSeparator} />
            </ul>
          </Popover>
        );

      case "tableList":
        return (
          <Popover
            id={`popover-positioned`}
            className={`${styles.tableListCon} ${styles.popover} ${customPopupstyles}`}
          >
            <ul className={styles.popoverElementsList}>
              <div className={styles.tableOptionsCon}>
                <span
                  className={` ${styles.cursor}`}
                  onClick={() => {
                    optionClick &&
                      optionClick({
                        id: props?.cellData?.id,
                        option: "Make Primary Admin",
                      });
                    setShowPopover(false);
                  }}
                >
                  Make Primary Admin
                </span>
                <span
                  className={`  ${styles.cursor}`}
                  onClick={() => {
                    optionClick &&
                      optionClick({
                        id: props?.cellData?.id,
                        option: "Edit",
                      });
                    setShowPopover(false);
                  }}
                >
                  Edit
                </span>
                <span
                  className={` ${styles.cursor}`}
                  onClick={() => {
                    optionClick &&
                      optionClick({
                        id: props?.cellData?.id,
                        option: "Reset",
                        name: props?.cellData?.name,
                      });
                    setShowPopover(false);
                  }}
                >
                  Reset Password
                </span>
              </div>
              <div className={styles.tableSeparator} />
              <div className={styles.tableOptionsCon}>
                <span
                  className={`${styles.deleteOptionStyle} ${styles.cursor}`}
                  onClick={() => {
                    optionClick &&
                      optionClick({
                        id: props.cellData?.id,
                        option: "Delete",
                        name: props?.cellData?.name,
                      });
                    setShowPopover(false);
                  }}
                >
                  Delete
                </span>
              </div>
            </ul>
          </Popover>
        );

      case "tableMarkList":
        return (
          <Popover
            id={`popover-positioned`}
            className={`${styles.tableListCon} ${styles.popover} ${customPopupstyles}`}
          >
            <ul className={styles.popoverElementsList}>
              <div className={styles.tableOptionsCon}>
                <span
                  className={` ${styles.cursor}`}
                  onClick={() =>
                    optionClick &&
                    optionClick({
                      id: props?.cellData?.id,
                      option: "View",
                    })
                  }
                >
                  View
                </span>
                <span
                  className={`  ${styles.cursor}`}
                  onClick={() =>
                    optionClick &&
                    optionClick({
                      id: props?.cellData?.id,
                      option: "Mark as In Active",
                    })
                  }
                >
                  Mark as In Active
                </span>
                <span
                  className={`  ${styles.cursor}`}
                  onClick={() =>
                    optionClick &&
                    optionClick({
                      id: props?.cellData?.id,
                      option: "Mark as Active",
                    })
                  }
                >
                  Mark as Active
                </span>
              </div>
              <div className={styles.tableSeparator} />
              <div className={styles.tableOptionsCon}>
                <span
                  className={`${styles.deleteOptionStyle} ${styles.cursor}`}
                  onClick={() =>
                    optionClick &&
                    optionClick({
                      id: props.cellData?.id,
                      option: "Delete",
                      name: props?.cellData?.name,
                    })
                  }
                >
                  Delete
                </span>
              </div>
            </ul>
          </Popover>
        );

      case "tableActions":
        return (
          <Popover
            id={`popover-positioned`}
            className={`${styles.tableListCon} ${styles.popover} ${customPopupstyles}`}
          >
            <ul
              className={`${styles.popoverActionList} ${
                isLoading ? "px-1" : ""
              }`}
            >
              {!isLoading ? (
                <Fragment>
                  {popoverActions?.map((each, index) => {
                    return (
                      <li
                        key={index}
                        className={`${
                          each?.disable
                            ? styles.disableEachActionItem
                            : styles.eachActionItem
                        } ${each?.isDelete ? styles.deleteActionStyle : ""} `}
                        onClick={(e) => handleOptionsClick(e, each)}
                      >
                        {each?.label}
                      </li>
                    );
                  })}{" "}
                </Fragment>
              ) : (
                <Fragment>
                  <Placeholder
                    xs={12}
                    size="xs"
                    bg="secondary"
                    animation="wave"
                    as="p"
                    className={styles.skeletonLoader}
                  />
                  <Placeholder
                    xs={12}
                    size="xs"
                    bg="secondary"
                    animation="wave"
                    as="p"
                    className={styles.skeletonLoader}
                  />
                </Fragment>
              )}
            </ul>
          </Popover>
        );

      case "profile":
        return (
          <Popover
            id={`popover-positioned`}
            className={styles.profileContainer}
          >
            <Avatar
              size={"36"}
              round="18px"
              facebook-id="invalidfacebookusername"
              name={popoverProfile?.name}
              style={{ marginBottom: "14px" }}
              src={popoverProfile?.src}
              // src="http://www.gravatar.com/avatar/a16a38cdfe8b2cbd38e8a56ab93238d3"
            />
            <span className={`${styles.profilenamebold} ${styles.marginB7}`}>
              {popoverProfile?.name}
            </span>
            <span className={`${styles.profileEmailStyle} ${styles.marginB7}`}>
              {popoverProfile?.email}
            </span>
            {navBarType === "user" ? (
              <>
                <Link
                  className={`${styles.subText} ${styles.marginB7}`}
                  href={ApplicationURLS.USER_PERSONAL_INFO}
                >
                  Manage Personal Info
                </Link>

                <Link
                  className={`${styles.subText} ${styles.marginB7}`}
                  href={ApplicationURLS.USER_SIGN_IN_AND_SECURITY}
                >
                  Sign in & Security
                </Link>
              </>
            ) : (
              <>
                <Link
                  className={`${styles.subText} ${styles.marginB7}`}
                  href={ApplicationURLS.ADMIN_PERSONAL_INFO}
                >
                  Manage Personal Info
                </Link>

                <Link
                  className={`${styles.subText} ${styles.marginB7}`}
                  href={ApplicationURLS.ADMIN_SIGN_IN_AND_SECURITY}
                >
                  Sign in & Security
                </Link>
              </>
            )}
            <div className={styles.profileLine} />
            <FormButton
              className={styles.profileBtn}
              onClick={() => setShowConfirmationModal(true)}
            >
              Sign out
            </FormButton>
          </Popover>
        );

      case "addbusiness":
        return (
          <Popover
            id={`popover-positioned`}
            className={styles.UserProfileContainer}
          >
            <h6 className={styles.popoverHeading}>Select Profile</h6>
            <Button
              onClick={handleAddNewClick}
              className={styles.userProfileBtn}
            >
              + Add New
            </Button>
            <div className={styles.overflowStyles}>
              <div>
                <Avatar
                  className={styles.userAvatarStyles}
                  style={{ cursor: "pointer", marginBottom: "14px" }}
                  size={"36"}
                  round="18px"
                  name={popoverProfile?.name}
                  onClick={handleUserAvatarClick}
                  src={popoverProfile?.src}
                />
                <span
                  className={`${styles.profileNameStyle} ${styles.userMarginB7} ${styles.cursor}`}
                  onClick={handleUserAvatarClick}
                >
                  {userData
                    ? userData.userName.length > 30
                      ? userData.userName.slice(0, 28) + ".."
                      : userData.userName
                    : ""}
                </span>
              </div>
              {reorderedProfiles?.map((profile: CompanyProfile) => (
                <div style={{ position: "relative" }} key={profile.company_id}>
                  <Avatar
                    className={styles.userAvatarStyles}
                    style={{ cursor: "pointer", marginBottom: "14px" }}
                    size={"36"}
                    round={profile?.company_id !== null ? "4px" : "18px"}
                    name={profile.company_name}
                    onClick={() => {
                      if (profile.status !== "Inactive") {
                        handleAvatarClick(profile);
                      }
                    }}
                    src={profile?.file_path}
                  />
                  <span
                    className={`${styles.profileNameStyle} ${styles.userMarginB7} ${styles.cursor}`}
                    onClick={() => {
                      if (profile.status !== "Inactive") {
                        handleAvatarClick(profile);
                      }
                    }}
                  >
                    {profile?.company_name.length > 30
                      ? profile?.company_name.slice(0, 33) + "..."
                      : profile?.company_name}
                    {profile?.status === "Inactive" && (
                      <p className={styles.pendingProfileStyles}>Pending</p>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </Popover>
        );

      case "addcompany":
        return (
          <Popover
            id={`popover-positioned`}
            className={styles.profileContainerCompanyInfo}
          >
            <Button
              onClick={() => {
                optionClick &&
                  optionClick({
                    id: "",
                    option: "Add New",
                  });
              }}
              className={styles.addBusinessProfileBtn}
            >
              + Add New
            </Button>
            {popoverOptions?.length === 0 ? (
              <span
                className={`${styles.profileEmailStyle} ${styles.companyMarginB7}`}
              >
                No matches found
              </span>
            ) : (
              <div className={styles.addCompanyStyles}>
                {popoverOptions?.map((each, index) => (
                  <div
                    key={index}
                    className={styles.addBusinessStyles}
                    onClick={() => {
                      optionClick &&
                        optionClick({
                          id: each?.company_id,
                          option: "companyName",
                          entityType: each?.entity_type,
                          address: each?.company_address,
                          name: each?.company_name,
                          businessName: each?.legal_company_name,
                        });
                    }}
                  >
                    <div className={styles.addCompanyAvatarStyles}>
                      <Row className="w-100">
                        <Col lg={10} sm={10} xs={10}>
                          <div className="mt-2">
                            {each?.company_name} •{" "}
                            <span className={styles.entityNameStyles}>
                              {each?.entity_type}
                            </span>
                            {each?.legal_company_name && (
                              <>
                                {" "}
                                •{" "}
                                <span className={styles.legalNameStyles}>
                                  {each?.legal_company_name}
                                </span>
                              </>
                            )}
                          </div>
                        </Col>
                        <Col lg={2} sm={2} xs={2}>
                          <div>
                            <Avatar
                              className={styles.addCompanyFileStyles}
                              size={"36"}
                              round="18px"
                              facebook-id="invalidfacebookusername"
                              name={popoverProfile?.name}
                              src={each?.file}
                            />
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Popover>
        );

      case "invitationList":
        return (
          <Popover
            id={`popover-positioned`}
            className={`${styles.tableListCon} ${styles.popover} ${customPopupstyles}`}
          >
            {/* Accept and Decline options */}
            <div className={styles.popoverElementsList}>
              <div className={styles.tableOptionsCon}>
                <span
                  className={`${styles.cursor} ${styles.tableOptionsCon}`}
                  onClick={() =>
                    optionClick &&
                    optionClick({
                      id: props?.cellData?.id,
                      option: "Accept",
                    })
                  }
                >
                  Accept
                </span>
                <span
                  className={`${styles.cursor} ${styles.deleteTextCon}`}
                  onClick={() =>
                    optionClick &&
                    optionClick({
                      id: props.cellData?.id,
                      option: "Decline",
                      name: props?.cellData?.name,
                    })
                  }
                >
                  Decline
                </span>
              </div>
            </div>
          </Popover>
        );

      case "trustTableList":
        return (
          <Popover
            id={`popover-positioned`}
            className={`${styles.tableListCon} ${styles.popover} ${customPopupstyles}`}
          >
            <ul className={styles.popoverElementsList}>
              <div className={styles.tableOptionsCon}>
                <span
                  className={`${styles.deleteOptionStyle} ${styles.cursor}`}
                  onClick={() => {
                    optionClick &&
                      optionClick({
                        id: props.cellData?.id,
                        option: "Delete",
                        name: props?.cellData?.name,
                      });
                    setShowPopover(false);
                  }}
                >
                  Delete
                </span>
              </div>
            </ul>
          </Popover>
        );

      case "info":
        return (
          <Popover
            id={`popover-positioned`}
            className={`${styles.tableListCon} ${styles.popover} ${customPopupstyles}`}
          >
            <ul className={styles.popoverElementsList}>
              <div className={styles.tableOptionsCon}>
                <span
                  className={`  ${styles.cursor}`}
                  onClick={() =>
                    optionClick &&
                    optionClick({
                      id: props?.cellData?.id,
                      option:
                        "One (1) living unit includes e.g. a single detached dwelling, a duplex unit, or a residential unit designed for separate residential occupation.",
                    })
                  }
                >
                  One (1) living unit includes e.g. a single detached dwelling,
                  a duplex unit, or a residential unit designed for separate
                  residential occupation.
                </span>
              </div>
            </ul>
          </Popover>
        );

      case "adduser":
        return (
          <Popover
            id={`popover-positioned`}
            className={styles.profileContainerAddUser}
          >
            <FormButton
              onClick={handleAddNewClick}
              className={styles.addUserProfileBtn}
            >
              + Add New
            </FormButton>
            <div className={styles.userBlock} onClick={optionClick}>
              <div>
                <span
                  className={`${styles.profileNameStyle} ${styles.addUserNameStyles}`}
                >
                  {popoverProfile?.name}
                </span>
                <br />
                <span
                  className={`${styles.profileEmailStyle} ${styles.addUserEmailStyles}`}
                >
                  {popoverProfile?.email}
                </span>
              </div>
              <div className={styles.addUserAvatarStyles}>
                <Avatar
                  size={"36"}
                  round="18px"
                  facebook-id="invalidfacebookusername"
                  name={popoverProfile?.name}
                  style={{ marginBottom: "14px" }}
                  src={popoverProfile?.src}
                />
              </div>
            </div>
            {/* <div className={styles.profileLine} /> */}
          </Popover>
        );

      default:
        return <span></span>;
    }
  };

  useEffect(() => {
    if (popoverTypes === "addbusiness" && getCompanyName) {
      getCompanyName().then((name) => setCompanyName(name));
    }
  }, [popoverTypes, getCompanyName]);

  return (
    <Fragment>
      <AppModal
        show={showConfirmationModal}
        onHide={() => setShowConfirmationModal(false)}
        secondButtonLabel={"Cancel"}
        firstButtonLabel="Sign out"
        modalHeading="Are you sure you want to sign out?"
        modalTitleStyle={styles.confirmationModalTitle}
        modalBodyTitle=""
        modalBodyContent={""}
        onConfirm={() => signOut()}
      />
      <OverlayTrigger
        trigger={trigger}
        show={showPopover}
        overlay={renderFunctionLayout(props)}
        rootClose
        onHide={handlePopoverToggle as any}
        {...rest}
      >
        <div onClick={handlePopoverToggle} ref={overlayRef}>
          {typeof children === "function"
            ? (children as (props: OverlayTriggerRenderProps) => ReactNode)({
                ref: overlayRef,
              })
            : children}
        </div>
      </OverlayTrigger>
    </Fragment>
  );
};

export default Overlays;
// export default dynamic(() => Promise.resolve(Overlays), {
//   ssr: false,
// });
