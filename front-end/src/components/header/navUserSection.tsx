//default imports
"use client";
import { Fragment, useEffect, useState } from "react";
import Image from "next/image";
import { getCookie } from "cookies-next";
import Link from "next/link";
//import from reactstrap components
import { Nav, NavDropdown } from "react-bootstrap";
//import from customized components
//import customized styles and images
import styles from "./navbar.module.scss";
import UK from "../../../public/assets/uk-flag.svg";
import australia from "../../../public/assets/australia-flag.svg";
//import from external libraries
//import from constants, interfaces ,functions and services
import {
  UNITED_KINGDOM,
  AUSTRALIA,
} from "@/common/constants/identificationNumbers";
import { PAY_TRADE_UK_SITE } from "@/common/constants/general";
import { useTokenDetails } from "@/common/commonHooks";

//module level constants and interfaces

function DropdownLoginSignup({
  displayLogin = true,
}: Readonly<{
  displayLogin?: boolean;
}>) {
  //useState and useEffect Management
  const [selectedCountry, setSelectedCountry] = useState<number>(0);
  const { decodeTokenData }: any = useTokenDetails();

  useEffect(() => {
    const presentCountry: string | undefined = getCookie("country");
    if (presentCountry) setSelectedCountry(+presentCountry);
  }, [getCookie("country")]);

  //other Hooks

  return (
    <Nav className={styles.userSectionStyle}>
      <NavDropdown
        title={
          selectedCountry ? (
            <Image src={australia} width={28} height={28} alt="Uk" />
          ) : (
            "Select country"
          )
        }
        onSelect={(value: any) => setSelectedCountry(value)}
        className="country-dropdown"
      >
        <NavDropdown.Item href="#america" eventKey={UNITED_KINGDOM}>
          <Link href={PAY_TRADE_UK_SITE} target="_blank">
            <Image src={UK} width={30} height={30} alt="Uk" />
          </Link>
        </NavDropdown.Item>
        <NavDropdown.Item href="#australia" eventKey={AUSTRALIA}>
          <Image src={australia} width={30} height={30} alt="australia" />
        </NavDropdown.Item>
      </NavDropdown>

      {displayLogin && !decodeTokenData && (
        <Fragment>
          <Link href="/user/login" className={styles.link}>
            Login
          </Link>
          <span className={styles.separator}>/</span>
          <Link href="/user/registration/signup" className={styles.link}>
            Signup
          </Link>
        </Fragment>
      )}
    </Nav>
  );
}

export default DropdownLoginSignup;
