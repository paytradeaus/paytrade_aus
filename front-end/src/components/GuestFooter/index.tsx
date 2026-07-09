"use client";
import useThemeSwitcher from "@/hooks/theme";
import ukFlag from "../../../public/images/gb.svg";
import auFlag from "../../../public/images/au.svg";
import Image from "next/image";
import { useEffect, useState } from "react";
import PrivacyPolicyModal from "@/modules/general/PrivacyPolicy";
import TermsConditionsModal from "@/modules/general/TermsAndConditions";
import CookiePolicyModal from "@/modules/general/CookiePolicy";
import Security from "@/modules/general/Security";
import { AppRoutes } from "@/shared/constant/appRoutes";
import Link from "next/link";
import { useTokenDetails } from "@/hooks";
import { Roles } from "@/shared/constant/role";
import { RootState, useAppSelector } from "@/redux/store";
import _ from "lodash";
import {
  ABOUT_SECTION_FOOTER_CONTENT,
  ACKNOWLEDGEMENT_OF_COUNTRY,
} from "@/shared/constant/data";

export default function GuestFooter() {
  const [displayPrivacyPolicy, setDisplayPrivacyPolicy] = useState(false);
  const [displayTermsConditions, setDisplayTermsConditions] = useState(false);
  const [displayCookiePolicy, setDisplayCookiePolicy] = useState(false);
  const [displaySecurity, setDisplaySecurity] = useState(false);
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const { toggleTheme } = useThemeSwitcher();
  const [userProfile, setUserProfile] = useState<any>({});

  const updatedCompany: any = useAppSelector(
    (state: RootState) => state?.companyStore?.updatedcompany
  );

  useEffect(() => {
    if (decodeTokenData?.companySpecificRoles?.length) {
      setUserProfile(
        decodeTokenData?.companySpecificRoles.find((x: any) => x?.isSystemAdded)
      );
    }
  }, []);

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
    <footer className="footerLapping">
      <div className="pt_footer">
        <div className="grid">
          <div className="footerinfo">
            <Link href={AppRoutes.HOME} className="logo"></Link>
            <h6>About</h6>
            <p>{ABOUT_SECTION_FOOTER_CONTENT}</p>
            <div className="themeswitcher footerthemeswitcher">
              <span
                data-theme-switcher="dark"
                className="themeswitch darkswitch"
                onClick={() => toggleTheme()}
              >
                <i className="fa-light fa-moon"></i> SWITCH TO DARK MODE
              </span>
              <span
                data-theme-switcher="light"
                className="themeswitch lightswitch"
                onClick={() => toggleTheme()}
              >
                <i className="fa-light fa-sun"></i> SWITCH TO LIGHT MODE
              </span>
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
              {!accessTokenId ? (
                <li className="desktop">
                  <Link
                    href={AppRoutes.SUBSCRIPTION_PRICING}
                    className="contrast"
                  >
                    {"Pricing"}
                  </Link>
                </li>
              ) : (
                displaySubscriptions() && (
                  <li className="desktop">
                    <Link
                      href={AppRoutes.SUBSCRIPTION_PRICING}
                      className="contrast"
                    >
                      {"Subscription"}
                    </Link>
                  </li>
                )
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
                <Link href="/support" className="contrast">
                  Help & AI Search
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
            <h6>Trust Account Software</h6>
            <ul>
              <li>
                <Link href="/about-pay-trade" className="contrast">
                  About PayTrade
                </Link>
              </li>
              <li>
                <Link href="/pay-trade-facts" className="contrast">
                  PayTrade facts
                </Link>
              </li>
              <li>
                <Link
                  href="/project-trust-account-software"
                  className="contrast"
                >
                  Project trust account software
                </Link>
              </li>
              <li>
                <Link
                  href="/xero-project-trust-account-software"
                  className="contrast"
                >
                  Xero trust account software
                </Link>
              </li>
              <li>
                <Link
                  href="/audit-ready-project-trust-account-software"
                  className="contrast"
                >
                  Audit-ready trust software
                </Link>
              </li>
              <li>
                <Link
                  href="/retention-trust-account-software"
                  className="contrast"
                >
                  Retention trust software
                </Link>
              </li>
              <li>
                <Link
                  href="/compare/project-trust-account-software"
                  className="contrast"
                >
                  Compare trust software
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h6>Region</h6>
            <details className="dropdown countrybutton">
              <summary role="button" className="contrast outline countrydrop">
                <Image
                  src={auFlag}
                  alt="au-flag"
                  width={0}
                  height={0}
                  className="country"
                />
                Australia QLD
              </summary>
              <ul>
                {/* <li>
                  <Link href="#" className="countrylink">
                    <Image
                      src={ukFlag}
                      alt="au-flag"
                      width={0}
                      height={0}
                      className="country"
                    />
                    UK
                  </Link>
                </li> */}
                <li>
                  <Link href="#" className="countrylink">
                    <Image
                      src={auFlag}
                      alt="au-flag"
                      width={0}
                      height={0}
                      className="country"
                    />
                    Australia QLD
                  </Link>
                </li>
              </ul>
            </details>
            <br />
            <h6>Legal</h6>
            <ul className="nostyle_list">
              <li className="nostyle_list">
                <Link
                  href="#"
                  onClick={() => setDisplayTermsConditions(true)}
                  className="contrast"
                  style={{ textDecoration: "none" }}
                >
                  Terms & conditions
                </Link>
              </li>
              <li className="nostyle_list">
                <Link
                  href="#"
                  onClick={() => setDisplayPrivacyPolicy(true)}
                  className="contrast"
                  style={{ textDecoration: "none" }}
                >
                  Privacy policy
                </Link>
              </li>
              <li className="nostyle_list">
                <Link
                  href="#"
                  onClick={() => setDisplayCookiePolicy(true)}
                  className="contrast"
                  style={{ textDecoration: "none" }}
                >
                  Cookie policy
                </Link>
              </li>
              <li className="nostyle_list">
                <Link
                  href="#"
                  onClick={() => setDisplaySecurity(true)}
                  className="contrast"
                  style={{ textDecoration: "none" }}
                >
                  Security
                </Link>
              </li>
            </ul>
            {/* Modals */}
            {displayPrivacyPolicy && (
              <PrivacyPolicyModal
                display={displayPrivacyPolicy}
                onClose={() => setDisplayPrivacyPolicy(false)}
              />
            )}
            {displayTermsConditions && (
              <TermsConditionsModal
                display={displayTermsConditions}
                onClose={() => setDisplayTermsConditions(false)}
              />
            )}
            {displayCookiePolicy && (
              <CookiePolicyModal
                display={displayCookiePolicy}
                onClose={() => setDisplayCookiePolicy(false)}
              />
            )}
            {displaySecurity && (
              <Security
                display={displaySecurity}
                onClose={() => setDisplaySecurity(false)}
              />
            )}
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
  );
}
