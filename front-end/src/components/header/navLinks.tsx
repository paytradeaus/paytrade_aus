// NavbarLinks.js
import { Nav } from "react-bootstrap";
import { ApplicationURLS } from "@/common/applicationURLS";
import customStyles from "./navbar.module.scss";
import { ALL_ADMIN_ROLES, ALL_USER_ROLES } from "@/common/constants/roles";
import Link from "next/link";

const customLink = {
  display: "flex",
  alignItems: "center",
  textDecoration: "none",
  color: "#000000A6",
  padding: "0.5rem",
};

interface NavbarLinksProps {
  navlinkClass?: string;
  tokenData?: any;
}

const NavbarLinks: React.FC<NavbarLinksProps> = ({
  navlinkClass,
  tokenData,
}) => (
  <Nav className={customStyles.navLinks}>
    <Link style={customLink} href="#">
      Services
    </Link>
    <Link style={customLink} href="#">
      Pricing
    </Link>
    <Link style={customLink} href="/articles">
      Resources
    </Link>
    <Link style={customLink} href="/blog">
      Blog
    </Link>
    {tokenData && ALL_USER_ROLES.some((x: any) => x === tokenData.role) ? (
      <Link href={ApplicationURLS.USER_DASHBOARD} style={customLink}>
        Dashboard
      </Link>
    ) : tokenData && ALL_ADMIN_ROLES.some((x: any) => x === tokenData.role) ? (
      <Link href={ApplicationURLS.ADMIN_DASHBOARD} style={customLink}>
        Dashboard
      </Link>
    ) : (
      <></>
    )}
  </Nav>
);

export default NavbarLinks;
