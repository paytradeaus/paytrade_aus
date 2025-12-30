import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { setDisplayResponsiveSidebar } from "@/redux/slices/sidebar";
import { useTokenDetails } from "@/hooks";

import { useEffect, useState } from "react";
import { setAppUserDetails } from "@/redux/slices/userRegistrationSlice";
import { getFileByAttachmentType } from "@/app/api/commonApi";

import { AppRoutes } from "@/shared/constant/appRoutes";
import Link from "next/link";
import NavbarAccessProfile from "../NavbarAccessProfile";
import { Roles } from "@/shared/constant/role";
import { getCookie } from "cookies-next";
import _ from "lodash";

export default function MemberNavbar() {
  const dispatch = useAppDispatch();
  const updatedCompany: any = useAppSelector(
    (state: RootState) => state?.companyStore?.updatedcompany
  );
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const authTokenVerification = getCookie("accessVerification");
  const [userProfile, setUserProfile] = useState<any>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Call the service to get file by attachment type
        const imageFile: any = await getFileByAttachmentType("User_profile");
        dispatch(setAppUserDetails({ ...decodeTokenData, image: imageFile }));
      } catch (error) {
        console.error("Error fetching file:", error);
      }
    };
    fetchData();

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
    <div className="pt_nav">
      <nav>
        <ul>
          <li>
            <div
              className="menuopen mobile"
              onClick={() => dispatch(setDisplayResponsiveSidebar(true))}
            >
              <i className="fa-light fa-bars"></i>
            </div>
            <Link href={AppRoutes.HOME} className="logo"></Link>
          </li>
        </ul>

        <ul>
          <li className="desktop">
            <Link href={AppRoutes.HOME} className="contrast">
              Home
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
                      <Link href={"/headcontractors"}>Head contractors</Link>
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
          {displaySubscriptions() && (
            <li className="desktop">
              <Link href={AppRoutes.SUBSCRIPTION_PRICING} className="contrast">
                Subscription
              </Link>
            </li>
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
        {accessTokenId && authTokenVerification && <NavbarAccessProfile />}
      </nav>
    </div>
  );
}
