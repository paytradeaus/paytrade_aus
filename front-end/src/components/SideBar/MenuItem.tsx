import Link from "next/link";
import { useState } from "react";
import styles from "./sideBar.module.scss";
import { usePathname } from "next/navigation";

const MenuItem = ({
  icon,
  name,
  ArrowIcon,
  route,
  isShowFull,
  displayOnCollapse,
  subMenus,
  collapseArrow,
}: any) => {
  const routeName = usePathname();

  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);

  function toggleSubMenu() {
    setIsSubMenuOpen((prevState) => !prevState);
  }

  function isAnySubMenuActive() {
    return (
      (isShowFull &&
        subMenus?.length > 0 &&
        subMenus.some((subMenuItem: any) =>
          routeName.startsWith(subMenuItem.route)
        )) ??
      false
    );
  }

  return displayOnCollapse && isShowFull ? (
    <></>
  ) : (
    <div className={styles.boxContainer}>
      <div className={styles.mainLinkContainer}>
        <span
          className={`${styles.defaultBorder} ${
            route
              ? routeName.startsWith(route) || isAnySubMenuActive()
                ? styles.showBorderColor
                : ""
              : ""
          }`}
        ></span>
        <Link
          href={route}
          onClick={toggleSubMenu}
          className={`${styles.linkContainer} ${
            isShowFull ? "" : styles.linkContainerSmall
          }`}
          title={isShowFull ? "" : name}
        >
          {icon}
          {isShowFull && <span>{name}</span>}
        </Link>
      </div>
      <div className={styles.symbolIconContainer} onClick={toggleSubMenu}>
        <span
          className={`${styles.symbolIcon} ${
            collapseArrow && isSubMenuOpen ? styles.rotateIcon : ""
          }`}
        >
          {ArrowIcon}
        </span>
      </div>
    </div>
  );
};

export default MenuItem;
