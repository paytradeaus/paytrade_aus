import React, { useEffect, useState } from "react";
import MenuItem from "./MenuItem";
import { useAppDispatch } from "@/redux/store";
import styles from "./sideBar.module.scss";
import { List } from "react-bootstrap-icons";
import { setSidebarFullView } from "@/redux/slices/dashboardSlices";
import Overlays from "../Overlayes/Overlayes";
import Link from "next/link";

const Sidebar = (props: any) => {
  const { popoverOptions, sideBarOptions, sideBarFullView } = props;
  const [activeMenuItem, setActiveMenuItem] = useState("");
  const [isCollapseArrow, setIsCollapseArrow] = useState(false);

  const dispatch = useAppDispatch();

  /**
   * Determines if a menu item is active based on the current router path and the provided menu item data.
   *
   * @param menuItem - The menu item object containing information about the menu item and its submenus.
   */
  function isMenuActive(menuItem: any) {
    // Check if the menu item has submenus
    if (menuItem?.hasSubmenu) {
      // Set the active menu item based on whether the current menu item or any of its submenus are active
      setActiveMenuItem(
        menuItem?.route === activeMenuItem || findActiveSubMenu(menuItem)
          ? ""
          : menuItem?.route
      );
    } else {
      // Set the active menu item to the menu item's route
      setActiveMenuItem(menuItem?.route);
    }
  }

  /**
   * Finds if any sub-menu item of a given menu item is active.
   *
   * @param menuItem - The menu item object containing sub-menu items.
   * @returns A boolean indicating whether any sub-menu item is active.
   */
  function findActiveSubMenu(menuItem: any) {
    return menuItem?.subMenuList.some(
      (subMenuItem: any) => subMenuItem?.route === activeMenuItem
    );
  }

  function displaySubmenu(menuItem: any) {
    if (
      (menuItem?.hasSubmenu && activeMenuItem === menuItem?.name) ||
      (menuItem?.subMenuList?.length > 0 &&
        findActiveSubMenu(menuItem) &&
        sideBarFullView)
    ) {
      return true;
    } else {
      return false;
    }
  }

  return (
    <div className={styles.optionscontainer}>
      <div className={`${styles.newPlusButtonLinkStyle}`}>
        <Overlays
          trigger="click"
          placement={"bottom-start"}
          popoverOptions={popoverOptions}
          overlay={<span></span>}
          popoverTypes={"list"}
          customPopupstyles={styles.customPopupstyles}
          popperConfig={{
            modifiers: [
              sideBarFullView
                ? {
                    name: "offset",
                    options: {
                      offset: [30, 10], // Adjust the offset as needed
                    },
                  }
                : {
                    name: "offset",
                    options: {
                      offset: [0, 10], // Adjust the offset as needed
                    },
                  },
            ],
          }}
        >
          <div
            className={`${styles.plusButtonStyle} ${
              sideBarFullView ? "" : styles.buttonWidthStyle
            }`}
          >
            <span>+</span>
            {sideBarFullView && <span>New</span>}
          </div>
        </Overlays>
      </div>
      <div
        onClick={() => {
          dispatch(setSidebarFullView(!sideBarFullView));
        }}
        className={`${styles.marginL3} ${styles.linkContainer} ${
          sideBarFullView ? "" : styles.linkContainerSmall
        }`}
      >
        {sideBarFullView ? (
          <span>MENU</span>
        ) : (
          <List className={styles.listIconStyle} />
        )}
      </div>

      {/* Sidebar content */}
      {sideBarOptions?.map((menuItem: any, index: number) => (
        <div key={index} onClick={() => isMenuActive(menuItem)}>
          {/* <div key={index}> */}
          <MenuItem
            key={index}
            name={menuItem?.name}
            route={menuItem?.route}
            icon={menuItem?.icon}
            ArrowIcon={menuItem?.ArrowIcon}
            iconDirection={menuItem?.iconDirection}
            isShowFull={sideBarFullView}
            displayOnCollapse={menuItem?.displayOnCollapse}
            subMenus={menuItem?.subMenuList}
            collapseArrow={displaySubmenu(menuItem)}
          />
          {/* 
             Render submenu items if any of the following conditions are met:
             1. The menuItem has a submenu and it matches the activeMenuItem.
             2. The menuItem has a submenu list with at least one item whose route matches the activeMenuItem,
             the sidebar is in full view, and the sideBarFullView state is true.

             If any of the above conditions are met, render the submenu items.
          */}
          {displaySubmenu(menuItem) && (
            <div className={styles.catMenu}>
              <div>
                {menuItem?.subMenuList?.length > 0 &&
                  menuItem?.subMenuList.map(
                    (submenuItems: any, index: number) => (
                      <div
                        className={styles.menuStyles}
                        key={index}
                        onClick={(e: any) => {
                          e.stopPropagation();
                          isMenuActive(submenuItems);
                        }}
                      >
                        <Link
                          href={submenuItems?.route ?? ""}
                          // onClick={toggleSubMenu}
                          className={styles.subMenuLink}
                        >
                          {submenuItems?.icon}
                          {sideBarFullView && <span>{submenuItems?.name}</span>}
                        </Link>
                      </div>
                    )
                  )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default Sidebar;
