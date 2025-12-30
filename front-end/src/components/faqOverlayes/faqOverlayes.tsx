import React, { Fragment, ReactNode, useEffect, useRef, useState } from "react";
import { OverlayTrigger, OverlayTriggerProps, Popover } from "react-bootstrap";
import styles from "./faqOverlayes.module.scss";
import Avatar from "react-avatar";
import FormButton from "../Button/button";
import { OverlayTriggerRenderProps } from "react-bootstrap/esm/OverlayTrigger";
import { useRouter } from "next/navigation";
import { clearALLCookies } from "@/common/commonFunctions";
import { ApplicationURLS } from "@/common/applicationURLS";
import { AppModal } from "../model/model";
import Link from "next/link";

interface overlaysProps extends OverlayTriggerProps {
  popoverOptions?: Array<any>;
  popoverProfile?: {
    name: string;
    email?: string;
    src?: any;
  };
  popoverTypes:
    | "list"
    | "help"
    | "profile"
    | "custom"
    | "tableList"
    | "addbusiness"
    | "addcompany"
    | "userTableListActions"
    | "companyTableListActions";

  customPopupstyles?: any;
  optionClick?: (value: any) => void;
  cellData?: string | number | any;
  getCompanyName?: () => Promise<string>;
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
    ...rest
  } = props;

  const [showPopover, setShowPopover] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [companyName, setCompanyName] = useState<string>("");

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
    document.addEventListener("mousedown", handleClickOutsideListener);

    return () => {
      document.removeEventListener("mousedown", handleClickOutsideListener);
    };
  }, [overlayRef]);

  const handlePopoverToggle = () => {
    setShowPopover(!showPopover);
  };

  const handleAddNewClick = () => {
    router.push("/user/add-company");
  };

  const handleBusinessClick = () => {
    router.push("/user/add-business");
  };

  const handleAvatarClick = () => {
    router.push("/company/user-access");
  };

  function signOut() {
    clearALLCookies();
    router.push(ApplicationURLS.HOME);
  }

  const renderFunctionLayout = (props: overlaysProps) => {
    switch (popoverTypes) {
      case "help":
        return (
          <Popover id={`popover-positioned`} className={styles.helpContainer}>
            <span>FAQ</span>
            <span>Contact Pay Trade</span>
          </Popover>
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
                    <div key={index} className={styles.eachSection}>
                      <span className={styles.popoverHeading}>
                        {section.heading}
                      </span>
                      <ul className={styles.popoverElementsList}>
                        {section?.elements.map((element: any) => (
                          <li key={element} className={styles.cursor}>
                            {element}
                          </li>
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

      case "companyTableListActions":
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
                      option: "Edit",
                      name: props?.cellData?.name,
                      companyID: props?.cellData?.companyID,
                    })
                  }
                >
                  View
                </span>

                <span
                  className={` ${styles.cursor2}`}
                  onClick={() =>
                    optionClick &&
                    optionClick({
                      id: props?.cellData?.id,
                      option: "status",
                      name: props?.cellData?.name,
                      companyID: props?.cellData?.companyID,
                      isAdminBlocked: props?.cellData?.isAdminBlocked,
                    })
                  }
                >
                  {props?.cellData?.isAdminBlocked ? "Unblock" : "Block"}
                </span>
              </div>
              <div className={styles.tableSeparator} />
            </ul>
          </Popover>
        );

      case "userTableListActions":
        return (
          <Popover
            id={`popover-positioned`}
            className={`${styles.tableListCon} ${styles.popover} ${customPopupstyles}`}
          >
            <ul className={styles.popoverElementsList}>
              <div className={styles.tableOptionsCon}>
                <span
                  className={`${styles.cursor}`}
                  onClick={() =>
                    optionClick &&
                    optionClick({
                      id: props?.cellData?.id,
                      option: "Edit",
                      name: props?.cellData?.name,
                      userID: props?.cellData?.userID,
                    })
                  }
                >
                  View
                </span>
                <span
                  className={` ${styles.cursor}`}
                  onClick={() =>
                    optionClick &&
                    optionClick({
                      id: props?.cellData?.id,
                      option: "isAdminContacted",
                      name: props?.cellData?.name,
                      userID: props?.cellData?.userID,
                      status: props?.cellData?.status,
                      isAdminContacted: props?.cellData?.isAdminContacted,
                    })
                  }
                >
                  {props?.cellData?.isAdminContacted
                    ? "Mark As Uncontacted"
                    : "Mark As Contacted "}
                </span>
                <span
                  className={` ${styles.cursor}`}
                  onClick={() =>
                    optionClick &&
                    optionClick({
                      id: props?.cellData?.id,
                      option: "status",
                      name: props?.cellData?.name,
                      userID: props?.cellData?.userID,
                      status: props?.cellData?.status,
                      isAdminContacted: props?.cellData?.isAdminContacted,
                    })
                  }
                >
                  {props?.cellData?.status === "Blocked" ? "Unblock" : "Block"}
                </span>
                <span
                  className={` ${styles.cursor}`}
                  onClick={() =>
                    optionClick &&
                    optionClick({
                      id: props?.cellData?.id,
                      option: "Reset",
                      name: props?.cellData?.name,
                    })
                  }
                >
                  Reset Password
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
                <span className={` ${styles.cursor}`}>Mark as Active</span>
                <span
                  className={`  ${styles.cursor}`}
                  onClick={() =>
                    optionClick &&
                    optionClick({
                      id: props?.cellData?.id,
                      option: "Mark as InActive",
                    })
                  }
                >
                  Edit
                </span>
              </div>
              <div className={styles.tableSeparator} />
              <div className={styles.deleteTextCon}>
                <span
                  className={`${styles.popoverHeading} ${styles.cursor}`}
                  onClick={() =>
                    optionClick &&
                    optionClick({
                      id: props.cellData?.id,
                      option: "View",
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
              // src="http://www.gravatar.com/avatar/a16a38cdfe8b2cbd38e8a56ab93238d3"
            />
            <span className={`${styles.profileNameStyle} ${styles.marginB7}`}>
              {popoverProfile?.name}
            </span>
            <span className={`${styles.profileEmailStyle} ${styles.marginB7}`}>
              {popoverProfile?.email}
            </span>
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
            <FormButton
              onClick={handleAddNewClick}
              className={styles.userProfileBtn}
            >
              + Add New
            </FormButton>
            <div>
              <div>
                <Avatar
                  className={styles.userAvatarStyles}
                  style={{ cursor: "pointer", marginBottom: "14px" }}
                  size={"36"}
                  round="18px"
                  facebook-id="invalidfacebookusername"
                  name="avatar"
                  // src={ProfileAvatr.src.toString()}
                />
                <span
                  className={`${styles.profileNameStyle} ${styles.userMarginB7}`}
                >
                  {/* {popoverProfile?.name} */}
                  Andrew Taylor
                </span>
              </div>
              <div>
                <Avatar
                  className={styles.userAvatarStyles}
                  style={{ cursor: "pointer", marginBottom: "14px" }}
                  size={"36"}
                  round="18px"
                  facebook-id="invalidfacebookusername"
                  name="private limited"
                  onClick={handleAvatarClick}
                  // src={ProfileAvatr.src.toString()}
                />
                <span
                  className={`${styles.profileNameStyle} ${styles.userMarginB7}`}
                  onClick={handleAvatarClick}
                >
                  {/* {popoverProfile?.name} */}
                  {companyName}
                </span>
              </div>
            </div>
          </Popover>
        );

      case "addcompany":
        return (
          <Popover
            id={`popover-positioned`}
            className={styles.profileContainer}
          >
            {/* <Avatar
      case "addcompany":
        return (
          <Popover
            id={`popover-positioned`}
            className={styles.profileContainer}
          >
            {/* <Avatar
              style={{ cursor: "pointer" , marginBottom: "14px"}}
              size={"36"}
              round="18px"
              facebook-id="invalidfacebookusername"
              name="avatar"waSpai2kqHPS6c0y8mq7uRVmKEqQDlKQHbQb7TaL8R8=






              // src={ProfileAvatr.src.toString()}
            /> */}
            <FormButton
              onClick={handleBusinessClick}
              className={styles.companyProfileBtn}
            >
              + Add New
            </FormButton>

            <span
              className={`${styles.profileEmailStyle} ${styles.companyMarginB7}`}
            >
              {/* {popoverOptions?.company_name} */}
              No matches found
            </span>
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
        {...rest}
        show={props.show}
        overlay={renderFunctionLayout(props)}
        rootClose
        onHide={handlePopoverToggle as any}
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
