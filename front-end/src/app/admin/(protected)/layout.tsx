"use client";
import AdminNavbar from "@/components/AdminNavbar";
import { InactivityDetector } from "@/components/InactivityDetector/InactivityDetector";
import Footer from "@/components/MemberFooter";
import { showErrorToast } from "@/components/Toaster";
import { useLoaderContext } from "@/context/useLoader";
import { useIsClient, useTokenDetails } from "@/hooks";
import AdminSidebar from "@/modules/admin/AdminSideBar";
import { updateUserMode } from "@/redux/slices/userModeSlice";
import { setAppUserDetails } from "@/redux/slices/userRegistrationSlice";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { clearBrowserStorage } from "@/utils";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const responsiveSidebar = useAppSelector(
    (state: { memberSidebar: { displayResponsiveSidebar: boolean } }) =>
      state.memberSidebar.displayResponsiveSidebar
  );

  const { isClient }: any = useIsClient();

  const { decodeTokenData } = useTokenDetails();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const routePath = usePathname();
  const [timeoutId, setTimeoutId] = useState<number | any>("");
  const { tabId }: any = useLoaderContext();

  useEffect(() => {
    const broadcast = new BroadcastChannel("auth-channel");
    const handleLogoutEvent = (event: any) => {
      const { type, tabId: senderTabId } = event?.data || {};
      if (type === "LOGOUT" && senderTabId !== tabId) {
        router.push(AppRoutes.ADMIN_LOGIN);
        clearBrowserStorage();
        dispatch(updateUserMode(null));
        dispatch(setAppUserDetails({}));
        // toast.success(SIGN_OUT_IN_OTHER_TABS_MSG);
      }
    };

    broadcast.addEventListener("message", handleLogoutEvent);

    return () => broadcast.removeEventListener("message", handleLogoutEvent);
  }, []);

  useEffect(() => {
    const checkTokenExpiration = () => {
      if (!decodeTokenData?.isAdmin) {
        router.push(AppRoutes.ADMIN_LOGIN);
        return;
      }
      if (
        !decodeTokenData ||
        (typeof decodeTokenData === "object" &&
          Object.keys(decodeTokenData).length === 0)
      ) {
        clearBrowserStorage();
        new BroadcastChannel("auth-channel").postMessage({
          type: "LOGOUT",
          tabId,
        });
        showErrorToast("Your Session Has Expired! Please Login Again");
        dispatch(updateUserMode(null));
        dispatch(setAppUserDetails({}));
        router.push(AppRoutes.ADMIN_LOGIN);
        return;
      }

      const expireTime = new Date(decodeTokenData.exp * 1000);
      const currentTime = new Date();
      const timeDiff = expireTime.getTime() - currentTime.getTime();

      if (timeDiff <= 10) {
        handleSessionExpired();
        return;
      }

      const newTimeoutId = setTimeout(
        handleSessionExpired,
        timeDiff
      ) as unknown as number;
      setTimeoutId(newTimeoutId);
    };

    // Clear previous timeout when re-rendering or unmounting
    if (timeoutId !== "") {
      clearTimeout(timeoutId);
    }

    // Start new timeout
    checkTokenExpiration();

    // Clean up function
    return () => {
      if (timeoutId !== "") {
        clearTimeout(timeoutId);
      }
    };
  }, [routePath]);

  const handleSessionExpired = () => {
    clearBrowserStorage();
    new BroadcastChannel("auth-channel").postMessage({
      type: "LOGOUT",
      tabId,
    });
    showErrorToast("Your Session Has Expired! Please Login Again");
    dispatch(updateUserMode(null));
    dispatch(setAppUserDetails({}));
    router.push(AppRoutes.ADMIN_LOGIN);
  };

  // Ensure all hooks are called before any conditional logic
  if (!isClient) return null; // Avoid mismatches during hydration

  return (
    <div>
      <div className="pt_bg">
        <div className="pt_bgleft"></div>
        <div className="pt_bgright"></div>
      </div>
      <div
        className={` ${
          responsiveSidebar ? "close_left close_left_show" : "close_left"
        } `}
      ></div>
      <div className="pt_wrap">
        <div className="pt_dashboard maindashboard">
          <AdminSidebar />
          <div className="pt_right">
            <header>
              <AdminNavbar />
            </header>
            <main>{children}</main>
            <Footer />
          </div>
        </div>
      </div>
      <InactivityDetector />
    </div>
  );
}
