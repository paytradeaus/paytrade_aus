// SlideSidebar.js
import React from "react";
import { useAppDispatch } from "@/redux/store";
import MenuItem from "./MenuItem";
import SubMenu from "./SubMenu"; // Import the submenu component
import styles from "./sideBar.module.scss";

import Overlays from "../Overlayes/Overlayes";
import { setSidebarFullView } from "@/redux/slices/dashboardSlices";

export default function SlideSidebar(props: any) {
  const { popoverOptions, sideBarOptions, sideBarFullView } = props;

  const dispatch = useAppDispatch();

  return sideBarFullView ? (
    <div className={`${styles.sideBarsContainer} ${styles.fullView}`}>
      <div className={styles.optionscontainer}>
        <div className={`${styles.newPlusButtonLinkStyle} `}>
          <Overlays
            trigger="click"
            placement={"bottom-start"}
            popoverOptions={popoverOptions}
            overlay={<span></span>}
            popoverTypes={"list"}
            customPopupstyles={styles.customPopupstyles}
            popperConfig={{
              modifiers: [
                {
                  name: "offset",
                  options: {
                    offset: [30, 10], // Adjust the offset as needed
                  },
                },
              ],
            }}
          >
            <div className={styles.plusButtonStyle}>
              <span>+</span>
              <span>New</span>
            </div>
          </Overlays>
        </div>
        <div
          onClick={() => {
            dispatch(setSidebarFullView(!sideBarFullView));
          }}
          className={`${styles.marginL3} ${styles.linkContainer} `}
        >
          <span>MENU</span>
        </div>
        <>
          {sideBarOptions?.map((each: any, index: number) => (
            <React.Fragment key={index}>
              <MenuItem
                name={each?.name || ""}
                route={each?.route || ""}
                icon={each.icon || ""}
                isShowFull={true}
              />
              {each.name === "saiii" && <SubMenu />}{" "}
              {/* Render submenu for "saiii" */}
            </React.Fragment>
          ))}
        </>
      </div>
    </div>
  ) : null;
}
