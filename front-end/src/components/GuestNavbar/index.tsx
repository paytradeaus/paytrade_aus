import { useTokenDetails } from "@/hooks";
import { setDisplayResponsiveSidebar } from "@/redux/slices/sidebar";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { AdminRoles, Roles } from "@/shared/constant/role";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NavbarAccessProfile from "../NavbarAccessProfile";
import { AdminNavBarAccessProfile } from "../AdminNavbar/adminNavBarAccessProfile";
import { getCookie } from "cookies-next";
import _ from "lodash";
import { useEffect, useState } from "react";

export default function GuestNavbar() {
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const authTokenVerification = getCookie("accessVerification");

  const dispatch = useAppDispatch();
  const router = useRouter();
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

  function isAdmin() {
    return AdminRoles.includes(decodeTokenData?.role);
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
    <header>
      <div className="pt_nav">
        <nav>
          <ul>
            <li>
              <div className="menuopen mobile">
                <i
                  className="fa-light fa-bars"
                  onClick={() => dispatch(setDisplayResponsiveSidebar(true))}
                ></i>
              </div>
              <Link href={AppRoutes.HOME} className="logo"></Link>
            </li>
          </ul>
          <div>
            <ul>
              <li className="desktop">
                <Link href={AppRoutes.HOME} className="contrast">
                  {"Home"}
                </Link>
              </li>
              <li className="desktop">
                <details className="dropdown">
                  <summary role="button" className="outline contrast">
                    Who we help
                  </summary>
                  <ul className="megamenu">
                    <div className="megamenuinner" style={{ width: "400px" }}>
                      <div className="grid">
                        <div>
                          <Link href={"/principals"}>Principals/Clients</Link>
                          <Link href={"/headcontractors"}>
                            Head contractors
                          </Link>
                          <Link href={"/subcontractors"}>Subcontractors</Link>
                          <Link href={"/accountants"}>Accountants</Link>
                        </div>
                        <div>
                          <Link href={"/bookkeepers"}>Bookkeepers</Link>
                          <Link href={"/auditors"}>Auditors</Link>
                          <Link href={"/legal-practitioners"}>
                            Legal practitioners
                          </Link>
                        </div>
                      </div>
                    </div>
                  </ul>
                </details>
              </li>
              <li className="desktop">
                <Link href={"/features"} className="contrast">
                  Features
                </Link>
              </li>
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
              <li className="desktop">
                <details className="dropdown">
                  <summary role="button" className="outline contrast">
                    Support
                  </summary>
                  <ul className="megamenu">
                    <div className="megamenuinner" style={{ width: "400px" }}>
                      <div className="grid">
                        <div>
                          <Link href="/support">Help & AI Search</Link>
                          <Link href="/get-support">Get support</Link>
                          <Link href={"/faq"}>FAQs</Link>
                          <Link href={AppRoutes.COMMUNITY}>Community</Link>
                        </div>
                        <div>
                          <Link href={"/how-to-guides"}>How to guides</Link>
                          <Link href={"/blog"}>Blog</Link>
                          <Link href={"/articles"}>Resource</Link>
                        </div>
                      </div>
                    </div>
                  </ul>
                </details>
              </li>
            </ul>
          </div>

          {!getCookie("accessVerification") ? (
            <ul>
              <li className="navbutton">
                <button
                  onClick={() => {
                    router.push(AppRoutes.USER_LOGIN);
                  }}
                  role="button"
                  className="secondary cta"
                >
                  Login
                </button>
              </li>
              <li className="navbutton">
                <button
                  onClick={() => {
                    router.push(AppRoutes.USER_SIGNUP);
                  }}
                  role="button"
                  className="cta"
                >
                  Sign up for free
                </button>
              </li>
            </ul>
          ) : !isAdmin() ? (
            <NavbarAccessProfile />
          ) : (
            <AdminNavBarAccessProfile />
          )}
        </nav>
      </div>
    </header>
  );
}
