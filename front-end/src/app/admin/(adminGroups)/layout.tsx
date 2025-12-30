"use client";
import "bootstrap/dist/css/bootstrap.css";
// import { Inter } from "next/font/google";
import SideBarLayout from "@/components/SideBar";
import Navbar from "@/components/header/navbar";
import styles from "./dashboardLayout.module.scss";
import DashBoardNavBar from "@/components/header/dashBoardNavbar";
import { useEffect, useState } from "react";
import { useTokenDetails } from "@/common/commonHooks";
import { ApplicationURLS } from "@/common/applicationURLS";
import { usePathname, useRouter } from "next/navigation";
import { clearALLCookies } from "@/common/commonFunctions";
import { toast } from "@/app/Toaster";
import { InactivityDetector } from "@/container/InactivityDetector/InactivityDetector";
// import { SIGN_OUT_IN_OTHER_TABS_MSG } from "@/common/constants/messages";
import { useLoaderContext } from "@/context/useLoader";

// const inter = Inter({ subsets: ["latin"] });

export default function DashBoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        router.push(ApplicationURLS.ADMIN_LOGIN);
        clearALLCookies();
        // toast.success(SIGN_OUT_IN_OTHER_TABS_MSG);
      }
    };

    broadcast.addEventListener("message", handleLogoutEvent);

    return () => broadcast.removeEventListener("message", handleLogoutEvent);
  }, []);

  useEffect(() => {
    const checkTokenExpiration = () => {
      if (!decodeTokenData?.isAdmin) {
        router.push(ApplicationURLS.ADMIN_LOGIN);
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
        router.push(ApplicationURLS.ADMIN_LOGIN);
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
    router.push(ApplicationURLS.ADMIN_LOGIN);
  };

  return (
    <div className={styles.containerWraper}>
      <Navbar navlinkClass={""}>
        <DashBoardNavBar />
      </Navbar>

      <div className={styles.bodyContainer}>
        <div className={styles.mainConatianer}>
          <div className={styles.sidebarContainer}>
            <SideBarLayout isMainBar />
          </div>
          <div className={styles.contentDataCon}>
            <div className={styles.sliderSlideBar}>
              <SideBarLayout isMainBar={false} />
            </div>
            {children}
          </div>
        </div>
      </div>
      <InactivityDetector />
    </div>
  );
}
