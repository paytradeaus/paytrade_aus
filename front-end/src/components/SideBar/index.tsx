import { setDisplayResponsiveSidebar } from "@/redux/slices/sidebar";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { AppRoutes } from "@/shared/constant/appRoutes";
import Link from "next/link";
import { userSidebar } from "./sidebar.constants";
import { usePathname, useRouter } from "next/navigation";
import { ADD } from "@/shared/constant/general";
import { queryParamsData } from "@/modules/user/BankAccounts/bankAccount.constant";
import { queryParamsData as clientQueryParamsData } from "@/modules/user/ClientsAndSuppliers/AddClientsAndSuppliers/AddClientsAndSuppliers.constant";
import { Fragment, useEffect, useState } from "react";
import BaseModal from "../BaseModal";
import { Roles } from "@/shared/constant/role";
import _ from "lodash";
import { useTokenDetails } from "@/hooks";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { decodeTokenData } = useTokenDetails();
  const responsiveSidebar = useAppSelector(
    (state) => state.memberSidebar.displayResponsiveSidebar
  );
  const updatedCompany: any = useAppSelector(
    (state: RootState) => state?.companyStore?.updatedcompany
  );

  const [userProfile, setUserProfile] = useState<any>({});
  const [currentPath, setCurrentPath] = useState("");
  const dispatch = useAppDispatch();
  const [displayPaymentsModal, setDisplayPaymentsModal] = useState(false);

  useEffect(() => {
    if (decodeTokenData?.companySpecificRoles?.length) {
      setUserProfile(
        decodeTokenData?.companySpecificRoles.find((x: any) => x?.isSystemAdded)
      );
    }
    setCurrentPath(pathname);
  }, []);

  useEffect(() => {
    if (currentPath !== pathname) {
      setCurrentPath(pathname);
      dispatch(setDisplayResponsiveSidebar(false));
    }
  }, [pathname]);

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
      <div
        className={`${responsiveSidebar ? "pt_left pt_left_open" : "pt_left"}`}
      >
        <div className="mobilenavtop">
          <Link href={AppRoutes.HOME} className="logo"></Link>
          <div
            className="menuclose"
            onClick={() => dispatch(setDisplayResponsiveSidebar(false))}
          >
            <i className="fa-light fa-xmark"></i>
          </div>
        </div>

        <div className="pt_sidemenu">
          <ul className="cd-accordion cd-accordion--animated">
            <div className="loggedin">
              <details className="dropdown pt_addnew">
                <summary>
                  <i className="fa-light fa-hexagon-plus"></i>&nbsp;&nbsp;Add
                  new
                </summary>
                <ul>
                  <h5>Projects</h5>
                  <li>
                    <Link href={AppRoutes.USER_ADD_PROJECTS}>Project</Link>
                  </li>
                  <li>
                    <Link href={AppRoutes.USER_ADD_CONTRACTS}>Contract</Link>
                  </li>
                  <li>
                    <Link href={AppRoutes.USER_ADD_VARIATIONS}>Variation</Link>
                  </li>
                  <hr />
                  <h5>Accounts</h5>
                  <li>
                    <Link
                      href={`${AppRoutes.USER_ADD_BANK_ACCOUNTS}?type=${queryParamsData.PTA}`}
                    >
                      Project Trust Account
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`${AppRoutes.USER_ADD_BANK_ACCOUNTS}?type=${queryParamsData.RTA}`}
                    >
                      Retention Trust Account
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`${AppRoutes.USER_ADD_BANK_ACCOUNTS}?type=${queryParamsData.cash}`}
                    >
                      General Account
                    </Link>
                  </li>
                  <hr />
                  <h5>Clients & Suppliers</h5>
                  <li>
                    <Link
                      href={`${AppRoutes.USER_ADD_CLIENTS_AND_SUPPLIERS}?type=${clientQueryParamsData.CLIENT}`}
                    >
                      Client
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`${AppRoutes.USER_ADD_CLIENTS_AND_SUPPLIERS}?type=${clientQueryParamsData.SUPPLIER}`}
                    >
                      Supplier
                    </Link>
                  </li>
                  <li>
                    <Link href={`${AppRoutes.USER_ADD_CLAIMS}?mode=${ADD}`}>
                      Payment Claim
                    </Link>
                  </li>

                  <li
                    className="cu-pointer"
                    onClick={() => setDisplayPaymentsModal(true)}
                  >
                    Payment
                  </li>
                  <br />
                </ul>
              </details>
              {userSidebar?.map((sidebarRow: any, index: number) =>
                !sidebarRow?.nestedList ? (
                  <li className="cd-accordion__item" key={index}>
                    <Link href={sidebarRow?.routePath} passHref legacyBehavior>
                      <a
                        className={`contrast ${
                          pathname == sidebarRow?.routePath ? "active" : ""
                        }`}
                      >
                        <i className={sidebarRow?.icon}></i>
                        <span>{sidebarRow?.name}</span>
                      </a>
                    </Link>
                  </li>
                ) : (
                  <li
                    className="cd-accordion__item cd-accordion__item--has-children"
                    key={index}
                  >
                    <input
                      className="cd-accordion__input"
                      type="checkbox"
                      name={sidebarRow?.name}
                      id={sidebarRow?.name}
                    />
                    <label
                      className={`cd-accordion__label cd-accordion__label--icon-folder ${
                        sidebarRow?.nestedList.some(
                          (nestObj: any) => nestObj?.routePath === pathname
                        )
                          ? "active"
                          : ""
                      }`}
                      htmlFor={sidebarRow?.name}
                    >
                      <i className={sidebarRow?.icon}></i>
                      <span>{sidebarRow?.name}</span>
                    </label>

                    <ul className="cd-accordion__sub">
                      {sidebarRow?.nestedList.map(
                        (listRow: any, index: number) => (
                          <li className="cd-accordion__item" key={index}>
                            <Link
                              href={listRow?.routePath}
                              passHref
                              legacyBehavior
                            >
                              <a
                                className={`contrast ${
                                  pathname == listRow?.routePath
                                    ? "active link"
                                    : "link"
                                }`}
                              >
                                <span>{listRow?.name}</span>
                              </a>
                            </Link>
                          </li>
                        )
                      )}
                    </ul>
                  </li>
                )
              )}

              <hr />
            </div>

            <div className="mobile">
              <li className="cd-accordion__item">
                <Link href={AppRoutes.HOME} passHref legacyBehavior>
                  <a href="" className="contrast">
                    <i className="fa-light fa-house"></i>
                    <span>Home</span>
                  </a>
                </Link>
              </li>
              <li className="cd-accordion__item cd-accordion__item--has-children">
                <input
                  className="cd-accordion__input"
                  type="checkbox"
                  name="services"
                  id="services"
                />
                <label
                  className="cd-accordion__label cd-accordion__label--icon-folder"
                  htmlFor="services"
                >
                  <i className="fa-light fa-user-check"></i>
                  <span>Who we help</span>
                </label>
                <ul className="cd-accordion__sub">
                  <li className="cd-accordion__item">
                    <a href="principalsclients.html" className="link">
                      <i className="fa-light fa-users"></i>
                      <span>Principals / Clients</span>
                    </a>
                  </li>
                  <li className="cd-accordion__item">
                    <a href="headcontractors.html" className="link">
                      <i className="fa-light fa-user-crown"></i>
                      <span>Head contractors</span>
                    </a>
                  </li>
                  <li className="cd-accordion__item">
                    <a href="subcontractors.html" className="link">
                      <i className="fa-light fa-user-helmet-safety"></i>
                      <span>Subcontractors</span>
                    </a>
                  </li>
                  <li className="cd-accordion__item">
                    <a href="accountants.html" className="link">
                      <i className="fa-light fa-user-visor"></i>
                      <span>Accountants</span>
                    </a>
                  </li>
                  <li className="cd-accordion__item">
                    <a href="bookkeepers.html" className="link">
                      <i className="fa-light fa-user-shakespeare"></i>
                      <span>Bookkeepers</span>
                    </a>
                  </li>
                  <li className="cd-accordion__item">
                    <a href="auditors.html" className="link">
                      <i className="fa-light fa-user-police"></i>
                      <span>Auditors</span>
                    </a>
                  </li>
                  <li className="cd-accordion__item">
                    <a href="legalpracitioners.html" className="link">
                      <i className="fa-light fa-user-tie"></i>
                      <span>Legal practitioners</span>
                    </a>
                  </li>
                </ul>
              </li>
              <li className="cd-accordion__item">
                <a href="features.html" className="link contrast">
                  <i className="fa-light fa-check-to-slot"></i>
                  <span>Features</span>
                </a>
              </li>
              {displaySubscriptions() && (
                <li className="cd-accordion__item">
                  <Link
                    href={AppRoutes.SUBSCRIPTION_PRICING}
                    passHref
                    legacyBehavior
                  >
                    <a href="" className="contrast">
                      <i className="fa-light fa-house"></i>
                      <span>Subscription</span>
                    </a>
                  </Link>
                </li>
              )}
              <li className="cd-accordion__item cd-accordion__item--has-children">
                <input
                  className="cd-accordion__input"
                  type="checkbox"
                  name="support"
                  id="support"
                />
                <label
                  className="cd-accordion__label cd-accordion__label--icon-folder"
                  htmlFor="support"
                >
                  <i className="fa-light fa-handshake-angle"></i>
                  <span>Support</span>
                </label>
                <ul className="cd-accordion__sub">
                  <li className="cd-accordion__item">
                    <Link href="/support" className="link">
                      <i className="fa-light fa-magnifying-glass"></i>
                      <span>Help & AI Search</span>
                    </Link>
                  </li>
                  <li className="cd-accordion__item">
                    <Link href="/get-support" className="link">
                      <i className="fa-light fa-envelope-open-text"></i>
                      <span>Get support</span>
                    </Link>
                  </li>
                  <li className="cd-accordion__item">
                    <Link href="/faq" className="link">
                      <i className="fa-light fa-clipboard-question"></i>
                      <span>FAQs</span>
                    </Link>
                  </li>
                  <li className="cd-accordion__item">
                    <Link href="/community" className="link">
                      <i className="fa-light fa-comments-question-check"></i>
                      <span>Community</span>
                    </Link>
                  </li>
                  <li className="cd-accordion__item">
                    <Link href="/how-to-guides" className="link">
                      <i className="fa-light fa-message-bot"></i>
                      <span>How to Guides</span>
                    </Link>
                  </li>
                  <li className="cd-accordion__item">
                    <Link href="/blog" className="link">
                      <i className="fa-light fa-newspaper"></i>
                      <span>Blog</span>
                    </Link>
                  </li>
                  <li className="cd-accordion__item">
                    <Link href="/articles" className="link">
                      <i className="fa-light fa-building"></i>
                      <span>Resources</span>
                    </Link>
                  </li>
                </ul>
              </li>
            </div>
          </ul>
        </div>
      </div>
      {displayPaymentsModal && (
        <BaseModal
          modalId={"bank accounts delete modal"}
          displayModal={displayPaymentsModal}
          onHeaderIconClose={() => setDisplayPaymentsModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setDisplayPaymentsModal(false)}
          onConfirm={() => {
            router.push(AppRoutes.USER_PAY_APPS);
            setDisplayPaymentsModal(false);
            return true;
          }}
          firstButtonName="Back"
          secondButtonName="Payment claims"
        >
          <h4 className="text_center">
            Payment entries must be initiated from a payment claim. Please
            proceed to the payment claim list and select the payment claim the
            payment is related to.
          </h4>
        </BaseModal>
      )}
    </Fragment>
  );
}
