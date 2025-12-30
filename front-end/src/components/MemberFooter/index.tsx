"use client";
import ukFlag from "../../../public/images/gb.svg";
import auFlag from "../../../public/images/au.svg";
import Image from "next/image";
import { Fragment, useEffect, useState } from "react";
import PrivacyPolicyModal from "@/modules/general/PrivacyPolicy";
import { footerDivisions } from "@/shared/constant/general";
import CookiePolicyModal from "@/modules/general/CookiePolicy";
import TermsConditionsModal from "@/modules/general/TermsAndConditions";
import Security from "@/modules/general/Security";
import Link from "next/link";
import useThemeSwitcher from "@/hooks/theme";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { Roles } from "@/shared/constant/role";
import { RootState, useAppSelector } from "@/redux/store";
import { useTokenDetails } from "@/hooks";
import _ from "lodash";
import {
  ABOUT_SECTION_FOOTER_CONTENT,
  ACKNOWLEDGEMENT_OF_COUNTRY,
} from "@/shared/constant/data";

export default function MemberFooter() {
  const [displayPrivacyPolicy, setDisplayPrivacyPolicy] = useState(false);
  const [displayTermsConditions, setDisplayTermsConditions] = useState(false);
  const [displayCookiePolicy, setDisplayCookiePolicy] = useState(false);
  const [displaySecurity, setDisplaySecurity] = useState(false);
  const [userProfile, setUserProfile] = useState<any>({});
  const { decodeTokenData } = useTokenDetails();

  useEffect(() => {
    if (decodeTokenData?.companySpecificRoles?.length) {
      setUserProfile(
        decodeTokenData?.companySpecificRoles.find((x: any) => x?.isSystemAdded)
      );
    }
  }, []);

  const { toggleTheme } = useThemeSwitcher();

  const updatedCompany: any = useAppSelector(
    (state: RootState) => state?.companyStore?.updatedcompany
  );

  function displayFooterSections(modalType: string) {
    switch (modalType) {
      case footerDivisions.PRIVACY_POLICY:
        setDisplayPrivacyPolicy(true);
        break;
      case footerDivisions.COOKIE_POLICY:
        setDisplayCookiePolicy(true);
        break;
      case footerDivisions.TERMS_CONDITIONS:
        setDisplayTermsConditions(true);
        break;
      case footerDivisions.SECURITY:
        setDisplaySecurity(true);
        break;
      default:
        return null;
    }
  }

  function displaySubscriptions() {
    if (
      updatedCompany?.company_role === Roles.USER_PRIMARY_ADMIN ||
      updatedCompany?.company_role === Roles.ADMIN_ROLE
    ) {
      return true;
    } else if (
      _.isEmpty(updatedCompany) &&
      (userProfile?.role === Roles.ADMIN_ROLE ||
        userProfile?.role === Roles.USER_PRIMARY_ADMIN ||
        userProfile?.manageSubscription === "Yes")
    ) {
      return true;
    } else {
      return false;
    }
  }

  return (
    <Fragment>
      <footer className="footerLapping">
        <div className="pt_footer">
          <div className="grid">
            <div className="footerinfo">
              <Link href={AppRoutes.HOME} className="logo"></Link>
              <h6>About</h6>
              <p>{ABOUT_SECTION_FOOTER_CONTENT}</p>
              <div className="themeswitcher footerthemeswitcher">
                <a
                  data-theme-switcher="dark"
                  className="themeswitch darkswitch"
                  onClick={() => toggleTheme()}
                >
                  <i className="fa-light fa-moon"></i> SWITCH TO DARK MODE
                </a>
                <a
                  data-theme-switcher="light"
                  className="themeswitch lightswitch"
                  onClick={() => toggleTheme()}
                >
                  <i className="fa-light fa-sun"></i> SWITCH TO LIGHT MODE
                </a>
              </div>
            </div>
            <div className="footerlinks">
              <h6>Links</h6>
              <ul>
                {/* removed as per instruction from QA(nalantha) */}
                {/* <li>
                  <Link href="" className="contrast">
                    About
                  </Link>
                </li> */}
                {displaySubscriptions() && (
                  <li>
                    <Link
                      href={AppRoutes.SUBSCRIPTION_PRICING}
                      className="contrast"
                    >
                      Subscription
                    </Link>
                  </li>
                )}
                <li>
                  <Link href={"/faq"} className="contrast">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href={"/blog"} className="contrast">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href={AppRoutes.RESOURCE_GUIDES_VIEWS}
                    className="contrast"
                  >
                    Resources
                  </Link>
                </li>
                <li>
                  <Link href="/get-support" className="contrast">
                    Contact support
                  </Link>
                </li>
              </ul>
            </div>
            <div className="footerlinks">
              <h6>Region</h6>
              <details className="dropdown countrybutton">
                <summary role="button" className="contrast outline countrydrop">
                  <Image
                    src={auFlag}
                    alt="user-icon"
                    width={0}
                    height={0}
                    className="country"
                  />
                  Australia QLD
                </summary>
                <ul>
                  {/* <li>
                    <a href="#" className="countrylink">
                      <Image
                        src={ukFlag}
                        alt="user-icon"
                        width={0}
                        height={0}
                        className="country"
                      />
                      UK
                    </a>
                  </li> */}
                  <li>
                    <a href="#" className="countrylink">
                      <Image
                        src={auFlag}
                        alt="user-icon"
                        width={0}
                        height={0}
                        className="country"
                      />
                      Australia QLD
                    </a>
                  </li>
                </ul>
              </details>
              <br />
              <h6>Legal</h6>
              <ul>
                <li>
                  <a
                    href="#"
                    data-target="terms"
                    className="contrast"
                    onClick={() =>
                      displayFooterSections(footerDivisions.TERMS_CONDITIONS)
                    }
                  >
                    Terms & conditions
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    data-target="privacy"
                    className="contrast"
                    onClick={() =>
                      displayFooterSections(footerDivisions.PRIVACY_POLICY)
                    }
                  >
                    Privacy policy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    data-target="cookie"
                    className="contrast"
                    onClick={() =>
                      displayFooterSections(footerDivisions.COOKIE_POLICY)
                    }
                  >
                    Cookie policy
                  </a>
                </li>
                <li>
                  <Link
                    href="#"
                    data-target="cookie"
                    className="contrast"
                    onClick={() =>
                      displayFooterSections(footerDivisions.SECURITY)
                    }
                  >
                    Security
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <hr />
          <div className="grid">
            <div className="footerinfo">
              <h6>Acknowledgement of Country</h6>
              <p>{ACKNOWLEDGEMENT_OF_COUNTRY}</p>
            </div>
          </div>
          <small>
            &copy; <span className="dyn_year">{new Date().getFullYear()}</span>{" "}
            Carma 360 Pty Ltd
          </small>
        </div>
      </footer>
      {displayPrivacyPolicy && (
        <PrivacyPolicyModal
          display={displayPrivacyPolicy}
          onClose={() => setDisplayPrivacyPolicy(false)}
        />
      )}
      {displayCookiePolicy && (
        <CookiePolicyModal
          display={displayCookiePolicy}
          onClose={() => setDisplayCookiePolicy(false)}
        />
      )}
      {displayTermsConditions && (
        <TermsConditionsModal
          display={displayTermsConditions}
          onClose={() => setDisplayTermsConditions(false)}
        />
      )}
      {displaySecurity && (
        <Security
          display={displaySecurity}
          onClose={() => setDisplaySecurity(false)}
        />
      )}
    </Fragment>
  );
}
