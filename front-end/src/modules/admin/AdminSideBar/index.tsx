import { setDisplayResponsiveSidebar } from "@/redux/slices/sidebar";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { AppRoutes } from "@/shared/constant/appRoutes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTokenDetails } from "@/hooks";
import { GetSideMenusForAdmin } from "./adminSidebar.function";
import { useLoaderContext } from "@/context/useLoader";

export default function AdminSidebar() {
  const { decodeTokenData } = useTokenDetails();
  const responsiveSidebar = useAppSelector(
    (state) => state.memberSidebar.displayResponsiveSidebar
  );

  const [sidebarMenu, setSidebarMenu] = useState([]);
  const pathname = usePathname();
  const { setLoader }: any = useLoaderContext();

  const dispatch = useAppDispatch();

  useEffect(() => {
    // Fetch the side menu data from the API
    fetchAdminSidebar();
  }, []);

  async function fetchAdminSidebar() {
    try {
      setLoader(true);
      if (decodeTokenData?.isAdmin === true) {
        const response = await GetSideMenusForAdmin();
        if (response?.length > 0) {
          mapSidebarJson(response);
        } else {
          setSidebarMenu([]);
        }
      }
      setLoader(false);
    } catch (error) {
      setLoader(false);
    }
  }

  function mapSidebarJson(response: any) {
    const mappedData = response.map((item: any) => ({
      id: item.id,
      name: item.menu_name,
      icon: item.menu_icon,
      routePath: item.route_path,
      permissions: {
        view: item.view_permission,
        insert: item.insert_permission,
        update: item.update_permission,
        delete: item.delete_permission,
        print: item.print_permission,
        export: item.export_permission,
        list: item.list_permission,
        all: item.all_permission,
      },
      subMenus: item.sub_menus[0].name
        ? item.sub_menus.map((subMenu: any) => ({
            icon: subMenu.icon,
            name: subMenu.name,
            routePath: subMenu.route,
          }))
        : null,
    }));

    setSidebarMenu(mappedData);
  }

  return (
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
                <i className="fa-light fa-hexagon-plus"></i>&nbsp;&nbsp;Add new
              </summary>
              <ul>
                <h5>ACCOUNTS</h5>
                <li>
                  <Link href={AppRoutes.ADMIN_NORMAL_USERS_ADD}>User</Link>
                </li>
                <li>
                  <Link href={AppRoutes.ADMIN_BUSINESS_ADD}>
                    Business Profile
                  </Link>
                </li>
                <hr />
                <h5>COMMUNICATION</h5>
                <li>
                  <Link href={AppRoutes.ADMIN_COMMUNICATION_ADD}>Email</Link>
                </li>
                <br />
              </ul>
            </details>
            {sidebarMenu?.length > 0 &&
              sidebarMenu?.map((sidebarRow: any, index: number) =>
                !sidebarRow?.subMenus ? (
                  <li className="cd-accordion__item" key={`menu-${index}-${sidebarRow?.id}`}>
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
                    key={`menu-${index}-${sidebarRow?.id}`}
                  >
                    <input
                      className="cd-accordion__input"
                      type="checkbox"
                      name={sidebarRow?.name}
                      id={sidebarRow?.name}
                    />
                    <label
                      className={`cd-accordion__label cd-accordion__label--icon-folder ${
                        sidebarRow?.subMenus.some(
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
                      {sidebarRow?.subMenus.map((listRow: any, subIndex: number) => (
                        <li className="cd-accordion__item" key={`sub-${index}-${subIndex}`}>
                          <Link
                            href={listRow?.routePath}
                            passHref
                            legacyBehavior
                          >
                            <a
                              href="variations.html"
                              className={`contrast ${
                                pathname == listRow?.routePath ? "active" : ""
                              }`}
                            >
                              {/* <i className={listRow?.icon}></i> */}
                              <span>{listRow?.name}</span>
                            </a>
                          </Link>
                        </li>
                      ))}
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
                <i className="fa-light fa-memo-circle-check"></i>
                <span>Services</span>
              </label>
              <ul className="cd-accordion__sub">
                <li className="cd-accordion__item">
                  <a>
                    <i className="fa-light fa-memo"></i>
                    <span>Contractors</span>
                  </a>
                </li>
                <li className="cd-accordion__item">
                  <a>
                    <i className="fa-light fa-memo-circle-info"></i>
                    <span>Subcontractors</span>
                  </a>
                </li>
              </ul>
            </li>

            <li className="cd-accordion__item">
              <a className="contrast">
                <i className="fa-light fa-house"></i>
                <span>Pricing</span>
              </a>
            </li>
            <li className="cd-accordion__item">
              <a className="contrast">
                <i className="fa-light fa-house"></i>
                <span>Resources</span>
              </a>
            </li>
            <li className="cd-accordion__item">
              <a className="contrast">
                <i className="fa-light fa-house"></i>
                <span>Blog</span>
              </a>
            </li>
          </div>
        </ul>
      </div>
    </div>
  );
}
