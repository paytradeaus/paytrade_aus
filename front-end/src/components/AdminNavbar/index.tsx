import { useAppDispatch, useAppSelector } from "@/redux/store";
import { setDisplayResponsiveSidebar } from "@/redux/slices/sidebar";

import { AppRoutes } from "@/shared/constant/appRoutes";
import Link from "next/link";
import { AdminNavBarAccessProfile } from "./adminNavBarAccessProfile";
import { getCookie } from "cookies-next";
import { useTokenDetails } from "@/hooks";

export default function AdminNavbar() {
  const dispatch = useAppDispatch();
  const { accessTokenId } = useTokenDetails();
  const authTokenVerification = getCookie("accessVerification");
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
        {accessTokenId && authTokenVerification && <AdminNavBarAccessProfile />}
      </nav>
    </div>
  );
}
