"use client";
import { InactivityDetector } from "@/components/InactivityDetector/InactivityDetector";
import Footer from "@/components/MemberFooter";
import Navbar from "@/components/MemberNavbar";
import Sidebar from "@/components/SideBar";
import AiPanel from "@/components/AiPanel";
import AiLiveFollowTracker from "@/components/AiLiveFollowTracker";
import XeroReauthBanner from "@/modules/user/UserIntegrations/XeroReauthBanner";
import { hydrateUiPreferences } from "@/redux/slices/uiPreferences";
import { fetchUiPreferences } from "@/network/uiPreferences";
import { showErrorToast } from "@/components/Toaster";
import { useLoaderContext } from "@/context/useLoader";
import { useIsClient, useTokenDetails } from "@/hooks";
import { CheckUserStatus } from "@/network/existanceAPIsCheck";
import { updateUserMode } from "@/redux/slices/userModeSlice";
import { setAppUserDetails } from "@/redux/slices/userRegistrationSlice";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
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

  const navCollapsed = useAppSelector(
    (state: RootState) => state.uiPreferences.navCollapsed
  );
  const aiPanelState = useAppSelector(
    (state: RootState) => state.uiPreferences.aiPanelState
  );
  const aiPanelWidth = useAppSelector(
    (state: RootState) => state.uiPreferences.aiPanelWidth
  );
  const uiPrefsHydrated = useAppSelector(
    (state: RootState) => state.uiPreferences.hydrated
  );
  const aiLiveFollowEnabled = useAppSelector(
    (state: RootState) => state.uiPreferences.aiLiveFollowEnabled
  );

  // Get userMode from Redux
  const reduxUserMode = useAppSelector(
    (state: RootState) => state.userMode.mode
  );

  // Fallback to localStorage if Redux state is empty (e.g., after a page refresh)
  const localStorageUserMode =
    typeof window !== "undefined" ? localStorage.getItem("userMode") : null;

  const userMode = reduxUserMode || localStorageUserMode;

  const { isClient }: any = useIsClient();
  const { decodeTokenData } = useTokenDetails();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const routePath = usePathname();
  const [timeoutId, setTimeoutId] = useState<number | any>("");
  const { tabId }: any = useLoaderContext(); // Move this hook before the conditional return

  useEffect(() => {
    const broadcast = new BroadcastChannel("auth-channel");
    const handleLogoutEvent = (event: any) => {
      const { type, tabId: senderTabId } = event?.data || {};
      if (type === "LOGOUT" && senderTabId !== tabId) {
        router.push(AppRoutes.USER_LOGIN);
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
    const checkTokenExpiration = async () => {
      if (decodeTokenData?.isAdmin) {
        router.push(AppRoutes.USER_LOGIN);
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
        router.push(AppRoutes.USER_LOGIN);
        return;
      }
      try {
        if (decodeTokenData?.emailId) {
          const response = await CheckUserStatus();

          if (response?.status === "SUCCESS") {
            console.log("user in active mode");
          }
          if (response?.status === "ERROR") {
            clearBrowserStorage();
            showErrorToast(
              response?.message || "Account has been Blocked/Inactive"
            );
            dispatch(updateUserMode(null));
            dispatch(setAppUserDetails({}));
            router.push(AppRoutes.USER_LOGIN);
            return;
          }
        } else {
          clearBrowserStorage();
          showErrorToast("Something went wrong! Please Login Again");
          dispatch(updateUserMode(null));
          dispatch(setAppUserDetails({}));
          router.push(AppRoutes.USER_LOGIN);
          return;
        }
      } catch (error) {
        showErrorToast("Something went wrong! Please Login Again");
        console.log(error, "error");
        router.push(AppRoutes.USER_LOGIN);
        dispatch(updateUserMode(null));
        dispatch(setAppUserDetails({}));
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
    router.push(AppRoutes.USER_LOGIN);
    dispatch(updateUserMode(null));
    dispatch(setAppUserDetails({}));
  };

  useEffect(() => {
    if (uiPrefsHydrated) return;
    let cancelled = false;
    (async () => {
      const prefs = await fetchUiPreferences();
      if (cancelled) return;
      // Always mark hydrated so we don't keep re-fetching on route
      // changes — even if the request returned null we have the
      // localStorage-seeded defaults.
      dispatch(hydrateUiPreferences(prefs || {}));
    })();
    return () => {
      cancelled = true;
    };
  }, [uiPrefsHydrated, dispatch]);

  // Ensure all hooks are called before any conditional logic
  if (!isClient) return null; // Avoid mismatches during hydration

  // Compute the AI column width for the dashboard grid. "hidden" → 0,
  // "rail" → fixed 48px, "open" → user-resized width. When the user
  // hasn't enabled the AI assistant in Personal Info we collapse the
  // column entirely so the main content reclaims that horizontal space.
  const aiColPx = !aiLiveFollowEnabled
    ? 0
    : aiPanelState === "hidden"
      ? 0
      : aiPanelState === "rail"
        ? 48
        : aiPanelWidth;

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
        <div
          className={`pt_dashboard${navCollapsed ? " nav-collapsed" : ""}`}
          style={
            {
              "--ai-panel-w": `${aiColPx}px`,
            } as Record<string, string>
          }
        >
          <Sidebar />
          <div className="pt_right">
            {userMode === "Onboarding" && (
              <div className="container-fluid">
                <div className="pt_onboarding">Onboarding Mode</div>
              </div>
            )}
            <header>
              <Navbar />
            </header>
            <XeroReauthBanner />
            <main>{children}</main>
            <Footer />
          </div>
          <AiPanel />
        </div>
      </div>
      <AiLiveFollowTracker />
      <InactivityDetector />
    </div>
  );
}
