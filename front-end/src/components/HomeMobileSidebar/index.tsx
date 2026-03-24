import { useTokenDetails } from "@/hooks";
import { setDisplayResponsiveSidebar } from "@/redux/slices/sidebar";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { Roles } from "@/shared/constant/role";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomeMobileSidebar() {
  const responsiveSidebar = useAppSelector(
    (state) => state?.memberSidebar?.displayResponsiveSidebar
  );
  const dispatch = useAppDispatch();
  const { accessTokenId, decodeTokenData } = useTokenDetails();

  const updatedCompany: any = useAppSelector(
    (state: RootState) => state?.companyStore?.updatedcompany
  );

  function displaySubscriptions() {
    if (updatedCompany?.company_role === Roles.USER_PRIMARY_ADMIN) {
      return true;
    } else {
      return false;
    }
  }
  const pathname = usePathname();

  const [currentPath, setCurrentPath] = useState("");

  useEffect(() => {
    if (currentPath !== pathname) {
      setCurrentPath(pathname);
      dispatch(setDisplayResponsiveSidebar(false));
    }
  }, [pathname]);

  return (
    <div
      className={`${
        responsiveSidebar ? "pt_left mobile pt_left_open" : "pt_left mobile"
      }`}
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
          {/* <div className="loggedin">
            <li className="cd-accordion__item">
              <a href="dashboard.html" className="contrast">
                <i className="fa-light fa-house"></i>
                <span>Dashboard</span>
              </a>
            </li>

            <li className="cd-accordion__item cd-accordion__item">
              <input
                className="cd-accordion__input"
                type="checkbox"
                name="group-1"
                id="group-1"
              />
              <label className="cd-accordion__label" htmlFor="group-1">
                <i className="fa-light fa-rectangle-history"></i>
                <span>Projects</span>
              </label>
            </li>

            <li className="cd-accordion__item cd-accordion__item">
              <input
                className="cd-accordion__input"
                type="checkbox"
                name="group-1"
                id="group-1"
              />
              <label className="cd-accordion__label" htmlFor="group-1">
                <i className="fa-light fa-building-columns"></i>
                <span>Bank/trust accounts</span>
              </label>
            </li>

            <li className="cd-accordion__item cd-accordion__item">
              <input
                className="cd-accordion__input"
                type="checkbox"
                name="group-1"
                id="group-1"
              />
              <label className="cd-accordion__label" htmlFor="group-1">
                <i className="fa-light fa-users"></i>
                <span>Clients & suppliers</span>
              </label>
            </li>

            <li className="cd-accordion__item cd-accordion__item--has-children">
              <input
                className="cd-accordion__input"
                type="checkbox"
                name="contracts"
                id="contracts"
              />
              <label
                className="cd-accordion__label cd-accordion__label--icon-folder"
                htmlFor="contracts"
              >
                <i className="fa-light fa-memo-circle-check"></i>
                <span>Contracts</span>
              </label>
              <ul className="cd-accordion__sub">
                <li className="cd-accordion__item">
                  <a href="">
                    <i className="fa-light fa-memo"></i>
                    <span>View all</span>
                  </a>
                </li>
                <li className="cd-accordion__item">
                  <a href="">
                    <i className="fa-light fa-memo-circle-info"></i>
                    <span>Variations</span>
                  </a>
                </li>
              </ul>
            </li>

            <li className="cd-accordion__item cd-accordion__item">
              <input
                className="cd-accordion__input"
                type="checkbox"
                name="group-1"
                id="group-1"
              />
              <label className="cd-accordion__label" htmlFor="group-1">
                <i className="fa-light fa-file-invoice"></i>
                <span>Pay apps</span>
              </label>
            </li>

            <li className="cd-accordion__item cd-accordion__item">
              <input
                className="cd-accordion__input"
                type="checkbox"
                name="group-1"
                id="group-1"
              />
              <label className="cd-accordion__label" htmlFor="group-1">
                <i className="fa-light fa-users-viewfinder"></i>
                <span>Retentions</span>
              </label>
            </li>

            <li className="cd-accordion__item cd-accordion__item--has-children">
              <input
                className="cd-accordion__input"
                type="checkbox"
                name="payments"
                id="payments"
              />
              <label
                className="cd-accordion__label cd-accordion__label--icon-folder"
                htmlFor="payments"
              >
                <i className="fa-light fa-credit-card"></i>
                <span>Payments</span>
              </label>
              <ul className="cd-accordion__sub">
                <li className="cd-accordion__item">
                  <a className="cd-accordion__label" href="#0">
                    <i className="fa-light fa-receipt"></i>
                    <span>Payments list</span>
                  </a>
                </li>
                <li className="cd-accordion__item">
                  <a className="cd-accordion__label" href="#0">
                    <i className="fa-light fa-clipboard-list-check"></i>
                    <span>Payments to do</span>
                  </a>
                </li>
              </ul>
            </li>

            <li className="cd-accordion__item cd-accordion__item">
              <input
                className="cd-accordion__input"
                type="checkbox"
                name="group-1"
                id="group-1"
              />
              <label className="cd-accordion__label" htmlFor="group-1">
                <i className="fa-light fa-book"></i>
                <span>Bookkeeping</span>
              </label>
            </li>

            <li className="cd-accordion__item cd-accordion__item">
              <input
                className="cd-accordion__input"
                type="checkbox"
                name="group-1"
                id="group-1"
              />
              <label className="cd-accordion__label" htmlFor="group-1">
                <i className="fa-light fa-circle-exclamation"></i>
                <span>Notices</span>
              </label>
            </li>

            <li className="cd-accordion__item cd-accordion__item--has-children">
              <input
                className="cd-accordion__input"
                type="checkbox"
                name="trust-accounting"
                id="trust-accounting"
              />
              <label
                className="cd-accordion__label cd-accordion__label--icon-folder"
                htmlFor="trust-accounting"
              >
                <i className="fa-light fa-money-check"></i>
                <span>Trust Accounting</span>
              </label>
              <ul className="cd-accordion__sub">
                <li className="cd-accordion__item">
                  <a href="">
                    <i className="fa-light fa-money-check"></i>
                    <span>Journals</span>
                  </a>
                </li>
                <li className="cd-accordion__item">
                  <a href="">
                    <i className="fa-light fa-money-check"></i>
                    <span>Account ledger</span>
                  </a>
                </li>
                <li className="cd-accordion__item">
                  <a href="">
                    <i className="fa-light fa-money-check"></i>
                    <span>Trial balance statement</span>
                  </a>
                </li>
                <li className="cd-accordion__item">
                  <a href="">
                    <i className="fa-light fa-money-check"></i>
                    <span>Deposits and withdrawals report</span>
                  </a>
                </li>
                <li className="cd-accordion__item">
                  <a href="">
                    <i className="fa-light fa-money-check"></i>
                    <span>Reconciliation record</span>
                  </a>
                </li>
                <li className="cd-accordion__item">
                  <a href="">
                    <i className="fa-light fa-money-check"></i>
                    <span>Audit</span>
                  </a>
                </li>
              </ul>
            </li>

            <li className="cd-accordion__item cd-accordion__item">
              <input
                className="cd-accordion__input"
                type="checkbox"
                name="group-1"
                id="group-1"
              />
              <label className="cd-accordion__label" htmlFor="group-1">
                <i className="fa-light fa-shield-check"></i>
                <span>Compliance</span>
              </label>
            </li>

            <hr />
          </div> */}

          <div className="mobile">
            <ul>
              <li className="cd-accordion__item">
                <Link href={AppRoutes.HOME} className="contrast">
                  <i className="fa-light fa-house"></i>
                  <span>Home</span>
                </Link>
              </li>
              <li className="cd-accordion__item cd-accordion__item--has-children">
                <input
                  className="cd-accordion__input"
                  type="checkbox"
                  name="who-we-help"
                  id="who-we-help"
                />
                <label
                  className="cd-accordion__label cd-accordion__label--icon-folder"
                  htmlFor="who-we-help"
                >
                  <i className="fa-light fa-user-check"></i>
                  <span>Who we help</span>
                </label>
                <ul className="cd-accordion__sub">
                  <li className="cd-accordion__item">
                    <Link href={"/principals"} className="link">
                      <i className="fa-light fa-users"></i>
                      <span>Principals/Clients</span>
                    </Link>
                  </li>
                  <li className="cd-accordion__item">
                    <Link href={"/headcontractors"}>
                      <i className="fa-light fa-user-crown"></i>
                      <span>Head Contractors</span>
                    </Link>
                  </li>
                  <li className="cd-accordion__item">
                    <Link href={"/subcontractors"}>
                      <i className="fa-light fa-user-helmet-safety"></i>
                      <span>Subcontractors</span>
                    </Link>
                  </li>
                  <li className="cd-accordion__item">
                    <Link href={"/accountants"}>
                      <i className="fa-light fa-user-visor"></i>
                      <span>Accountants</span>
                    </Link>
                  </li>
                  <li className="cd-accordion__item">
                    <Link href={"/bookkeepers"}>
                      <i className="fa-light fa-user-shakespeare"></i>
                      <span>Bookkeepers</span>
                    </Link>
                  </li>
                  <li className="cd-accordion__item">
                    <Link href={"/auditors"}>
                      <i className="fa-light fa-user-police"></i>
                      <span>Auditors</span>
                    </Link>
                  </li>
                  <li className="cd-accordion__item">
                    <Link href={"/legal-practitioners"}>
                      <i className="fa-light fa-user-tie"></i>
                      <span>Legal Practitioners</span>
                    </Link>
                  </li>
                </ul>
              </li>

              <li className="cd-accordion__item">
                <Link href={"/features"} className="contrast">
                  <i className="fa-light fa-check-to-slot"></i>

                  <span>Features</span>
                </Link>
              </li>
              {!accessTokenId ? (
                <li className="cd-accordion__item">
                  <Link
                    href={AppRoutes.SUBSCRIPTION_PRICING}
                    className="contrast"
                  >
                    <i className="fa-light fa-coins"></i>
                    <span>Pricing</span>
                  </Link>
                </li>
              ) : (
                displaySubscriptions() && (
                  <li className="cd-accordion__item">
                    <Link
                      href={AppRoutes.SUBSCRIPTION_PRICING}
                      className="contrast"
                    >
                      {"Subscription"}
                    </Link>
                  </li>
                )
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
                    <Link href="/support">
                      <i className="fa-light fa-robot"></i>
                      <span>Help & AI Search</span>
                    </Link>
                  </li>
                  <li className="cd-accordion__item">
                    <Link href="/get-support">
                      <i className="fa-light fa-envelope-open-text"></i>
                      <span>Get support</span>
                    </Link>
                  </li>
                  <li className="cd-accordion__item">
                    <Link href="/faq">
                      <i className="fa-light fa-clipboard-question"></i>
                      <span>FAQs</span>
                    </Link>
                  </li>
                  <li className="cd-accordion__item">
                    <Link href={AppRoutes.COMMUNITY}>
                      <i className="fa-light fa-comments-question-check"></i>
                      <span>Community</span>
                    </Link>
                  </li>
                  <li className="cd-accordion__item">
                    <Link href="/how-to-guides">
                      <i className="fa-light fa-message-bot"></i>
                      <span>How to guides</span>
                    </Link>
                  </li>
                  <li className="cd-accordion__item">
                    <Link href="/blog">
                      <i className="fa-light fa-newspaper"></i>
                      <span>Blog</span>
                    </Link>
                  </li>
                  <li className="cd-accordion__item">
                    <Link href="/articles">
                      <i className="fa-light fa-file-alt"></i>
                      <span>Resource</span>
                    </Link>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </ul>
      </div>
    </div>
  );
}
