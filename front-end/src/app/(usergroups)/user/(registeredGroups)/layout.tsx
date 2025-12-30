"use client";
import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.css";
import Layout from "@/components/SideBar";
import Navbar from "@/components/header/navbar";
import styles from "./dashboard.module.scss";
import UserDashBoardNavBar from "@/components/header/userDashboard/userDashboardNavbar";
import { useTokenDetails } from "@/common/commonHooks";
import { ApplicationURLS } from "@/common/applicationURLS";
import { clearALLCookies } from "@/common/commonFunctions";
import { toast } from "@/app/Toaster";
import { usePathname, useRouter } from "next/navigation";
import { InactivityDetector } from "@/container/InactivityDetector/InactivityDetector";
import { CheckUserStatus } from "@/container/signInAndSecurity/signInAndSecurity.function";
// import { SIGN_OUT_IN_OTHER_TABS_MSG } from "@/common/constants/messages";
import { useLoaderContext } from "@/context/useLoader";
import { useDispatch } from "react-redux";
import ResetReduxState from "@/components/ResetRedux";

export default function RegisteredDashBoardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { decodeTokenData } = useTokenDetails();
  const router = useRouter();
  const routePath = usePathname();
  const [timeoutId, setTimeoutId] = useState<number | undefined>(undefined);

  const { tabId }: any = useLoaderContext();

  useEffect(() => {
    const broadcast = new BroadcastChannel("auth-channel");
    const handleLogoutEvent = (event: any) => {
      const { type, tabId: senderTabId } = event?.data || {};
      if (type === "LOGOUT" && senderTabId !== tabId) {
        router.push(ApplicationURLS.USER_LOGIN);
        clearALLCookies();
        // toast.success(SIGN_OUT_IN_OTHER_TABS_MSG);
      }
    };

    broadcast.addEventListener("message", handleLogoutEvent);

    return () => broadcast.removeEventListener("message", handleLogoutEvent);
  }, []);

  useEffect(() => {
    const checkTokenExpiration = async () => {
      if (decodeTokenData?.isAdmin) {
        router.push(ApplicationURLS.USER_LOGIN);
        return;
      }
      if (
        !decodeTokenData ||
        (typeof decodeTokenData === "object" &&
          Object.keys(decodeTokenData).length === 0)
      ) {
        clearALLCookies();
        new BroadcastChannel("auth-channel").postMessage({
          type: "LOGOUT",
          tabId,
        });
        toast.error("Your Session Has Expired! Please Login Again");
        router.push(ApplicationURLS.USER_LOGIN);
        return;
      }
      try {
        if (decodeTokenData?.emailId) {
          const response = await CheckUserStatus();

          if (response?.status === "SUCCESS") {
            console.log("user in active mode");
          }
          if (response?.status === "ERROR") {
            clearALLCookies();
            toast.error(
              response?.message || "Account has been Blocked/Inactive"
            );
            router.push(ApplicationURLS.USER_LOGIN);
            return;
          }
        } else {
          clearALLCookies();
          toast.error("Something went wrong! Please Login Again");
          router.push(ApplicationURLS.USER_LOGIN);
          return;
        }
      } catch (error) {
        toast.error("Something went wrong! Please Login Again");
        console.log(error, "error");
        router.push(ApplicationURLS.USER_LOGIN);
        return;
      }
      const expireTime = new Date(decodeTokenData?.exp * 1000);
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
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    // Start new timeout
    checkTokenExpiration();

    // Clean up function
    return () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [routePath]);
  const handleSessionExpired = () => {
    clearALLCookies();
    new BroadcastChannel("auth-channel").postMessage({ type: "LOGOUT", tabId });
    toast.error("Your Session Has Expired! Please Login Again");
    router.push(ApplicationURLS.USER_LOGIN);
  };

  return (
    <div className={styles.containerWraper}>
      <Navbar navlinkClass={""}>
        {routePath !== "/user/choose-profile" && <UserDashBoardNavBar />}
      </Navbar>
      <div className={styles.bodyContainer}>
        <div className={styles.mainConatianer}>
          {routePath !== "/user/choose-profile" && (
            <div className={styles.sidebarContainer}>
              <Layout isMainBar />
            </div>
          )}
          <div className={styles.contentDataCon}>
            {routePath !== "/user/choose-profile" && (
              <div className={styles.sliderSlideBar}>
                <Layout isMainBar={false} />
              </div>
            )}

            {children}
          </div>
        </div>
      </div>
      <InactivityDetector />
      <ResetReduxState />
    </div>
  );
}
