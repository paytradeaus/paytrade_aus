"use client";

// NavbarComponent.js
import { Container, Navbar as RBNavbar } from "react-bootstrap";
import Logo from "./navLogo";
import styles from "./navbar.module.scss";
import { usePathname } from "next/navigation";
import TextField from "../TextField/textField";
import { Search } from "react-bootstrap-icons";
import { RootState, useAppSelector } from "@/redux/store";
import { ReactNode } from "react";
import { useTokenDetails } from "@/common/commonHooks";

interface NavbarComponentProps {
  navlinkClass: string;
  children?: ReactNode;
}

const NavbarComponent: React.FC<NavbarComponentProps> = ({ children }) => {
  const { decodeTokenData }: any = useTokenDetails();

  const routePath = usePathname();
  const bottomBorder =
    routePath !== "/admin/login" &&
    routePath !== "/user/login" &&
    routePath !== "/user/registration/signup" &&
    routePath !== "/user/registration/details" &&
    routePath !== "/user/registration/profile-upload" &&
    routePath !== "/user/registration/verification" &&
    routePath !== "/user/registration/business-profile" &&
    routePath !== "/user/registration/tax" &&
    routePath !== "/user/registration/contact-business" &&
    routePath !== "/user/forgot-password";
  const hideSearchBarView = useAppSelector(
    (state: RootState) => state.dashBoard.hideSearchBarView
  );

  return (
    <div>
      <RBNavbar
        expand="lg"
        className={`${styles.navbarStyle} ${
          bottomBorder && styles.navBottomBorder
        }`}
      >
        <Container fluid>
          <Logo src={""} tokenData={decodeTokenData} />
          {children}
        </Container>
      </RBNavbar>
      {hideSearchBarView && (
        <div className={styles.hideSearchBar}>
          <TextField
            placeholder="Search"
            endingData={<Search />}
            endingDataStyles={styles.endIconStyle}
            classNames={`${styles.inputFieldControl}`}
          />
        </div>
      )}
    </div>
  );
};

export default NavbarComponent;
