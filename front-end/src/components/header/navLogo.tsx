// Logo.js
import Link from "next/link";
import Logo from "../../../public/assets/payTradeLogo.png";

import Image from "next/image";
import { ApplicationURLS } from "@/common/applicationURLS";
import { ALL_USER_ROLES } from "@/common/constants/roles";

interface NavbarLogoProps {
  src: string; // Explicitly specify the type for the src prop
  tokenData: any;
}

const NavLogo: React.FC<NavbarLogoProps> = ({ src, tokenData }) => (
  <Link
    // href={
    //   (tokenData && ALL_USER_ROLES?.some((x: any) => x === tokenData?.role)) ||
    //   !tokenData
    //     ? ApplicationURLS.HOME
    //     : ""
    // }
    href={ApplicationURLS.HOME}
  >
    <Image
      src={Logo.src}
      alt="Pay trade"
      className="d-inline-block align-top cursor-pointer"
      width={87}
      height={47}
    />
  </Link>
);

export default NavLogo;
