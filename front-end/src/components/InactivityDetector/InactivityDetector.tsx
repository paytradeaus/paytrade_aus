"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAppDispatch } from "@/redux/store";
import { updateUserMode } from "@/redux/slices/userModeSlice";

import { useLoaderContext } from "@/context/useLoader";
import { useTokenDetails } from "@/hooks";
import { setAppUserDetails } from "@/redux/slices/userRegistrationSlice";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { AdminRoles } from "@/shared/constant/role";
import { NO_ACTIVITY_DETECTED } from "@/shared/constant/messages";
import { showSuccessToast } from "../Toaster";
import BaseModal, { baseModalConstants } from "../BaseModal";
import { clearBrowserStorage, handleUserActivity } from "@/utils";

const AUTO_LOGOUT_TIMER = 600000; // 600 seconds in milliseconds
const WARNING_TIME = 300000; // 300 seconds before logout for warning

export const InactivityDetector = () => {
  const [displayAutoLogoutModal, setDisplayAutoLogoutModal] = useState(false);
  const [seconds, setSeconds] = useState(WARNING_TIME / 1000); // 15 seconds countdown
  const router = useRouter();
  const { decodeTokenData } = useTokenDetails();
  const dispatch = useAppDispatch();
  const routePath = usePathname();
  const { tabId }: any = useLoaderContext();

  let lastActivityTime = Date.now(); // Track last activity time

  const TAB_KEY = "last_activity";

  useEffect(() => {
    if (decodeTokenData) {
      // Add event listeners to track user activity

      window.addEventListener("mousemove", handleUserActivity);
      window.addEventListener("keypress", handleUserActivity);
      window.addEventListener("click", handleUserActivity);
      window.addEventListener("scroll", handleUserActivity);
      window.addEventListener("storage", syncAcrossTabs);

      // Start the idle monitoring interval
      const idleMonitor = setInterval(() => checkIfAllTabsIdle(), 1000);

      // Cleanup on component unmount
      return () => {
        window.removeEventListener("mousemove", handleUserActivity);
        window.removeEventListener("keypress", handleUserActivity);
        window.removeEventListener("click", handleUserActivity);
        window.removeEventListener("scroll", handleUserActivity);
        window.removeEventListener("storage", syncAcrossTabs);
        clearInterval(idleMonitor);
      };
    }
  }, [routePath]);

  const syncAcrossTabs = (event: StorageEvent) => {
    if (event.key === TAB_KEY) {
      setDisplayAutoLogoutModal(false);
      setSeconds(WARNING_TIME / 1000);
    }
  };

  const checkIfAllTabsIdle = () => {
    const now = Date.now();
    const lastActivity = parseInt(localStorage.getItem(TAB_KEY) || "0", 10);
    const elapsedTime = now - lastActivity;

    if (elapsedTime >= WARNING_TIME && elapsedTime < AUTO_LOGOUT_TIMER) {
      // Show the modal when idle for WARNING_TIME
      if (!displayAutoLogoutModal) {
        setDisplayAutoLogoutModal(true);
      }
    } else if (elapsedTime >= AUTO_LOGOUT_TIMER) {
      // Auto-logout after AUTO_LOGOUT_TIMER
      setDisplayAutoLogoutModal(false);
      signOut();
    }
  };

  // const monitorIdleTime = () => {
  //   const currentTime = Date.now();
  //   const elapsedTime = currentTime - lastActivityTime;
  //   // console.log(elapsedTime, "elapsedTime");

  //   if (elapsedTime >= WARNING_TIME && elapsedTime < AUTO_LOGOUT_TIMER) {
  //     // Show the modal when idle for WARNING_TIME
  //     if (!displayAutoLogoutModal) {
  //       setDisplayAutoLogoutModal(true);
  //     }
  //   } else if (elapsedTime >= AUTO_LOGOUT_TIMER) {
  //     // Auto-logout after AUTO_LOGOUT_TIMER
  //     setDisplayAutoLogoutModal(false);
  //     signOut();
  //   }
  // };

  useEffect(() => {
    let countdownInterval: NodeJS.Timeout | null = null;

    if (displayAutoLogoutModal) {
      // Start the countdown when the modal is visible
      countdownInterval = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval!);
            signOut(); // Trigger logout when countdown reaches 0
            return 0;
          }
          return prev - 1; // Decrement countdown
        });
      }, 1000);
    } else {
      // Reset the countdown if modal is closed
      setSeconds(WARNING_TIME / 1000);
    }

    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [displayAutoLogoutModal]);

  const signOut = async (clickedLogout = false) => {
    if (decodeTokenData?.userId) {
      const payload = decodeTokenData?.isAdmin
        ? {
            admin_id: decodeTokenData?.userId || null,
          }
        : {
            user_id: decodeTokenData?.userId || null,
          };
      // await triggerActivityLogAfterAnUserIsSignedOut(payload);
    }

    // ❌ Clear activity tracking from localStorage
    localStorage.removeItem(TAB_KEY);

    clearBrowserStorage();
    dispatch(updateUserMode(null));

    const { documentElement: html } = document;
    // Add class for closing transition
    html.classList.add(baseModalConstants.closingClass);
    setTimeout(() => {
      // Remove transition classes and reset the scrollbar width
      html.classList.remove(
        baseModalConstants.closingClass,
        baseModalConstants.isOpenClass
      );
      html.style.removeProperty(baseModalConstants.scrollbarWidthCssVar);
    }, baseModalConstants.animationDuration);

    new BroadcastChannel("auth-channel").postMessage({ type: "LOGOUT", tabId });
    dispatch(setAppUserDetails({}));
    if (AdminRoles.includes(decodeTokenData?.role)) {
      router.push(AppRoutes.ADMIN_LOGIN);
    } else {
      router.push(AppRoutes.USER_LOGIN);
    }

    !clickedLogout && showSuccessToast(NO_ACTIVITY_DETECTED);
    // showSuccessToast(NO_ACTIVITY_DETECTED);
  };

  return (
    <>
      {displayAutoLogoutModal && (
        <BaseModal
          modalId={"inactivity  detector modal"}
          displayModal={displayAutoLogoutModal}
          onClose={() => {
            setDisplayAutoLogoutModal(false);
            setSeconds(WARNING_TIME / 1000); // Reset countdown
          }}
          onConfirm={() => {
            signOut(true);
            return true;
          }}
          firstButtonName="I am still working"
          secondButtonName="Logout"
        >
          <h4 className="text_center">
            {`Auto logout in ${seconds} seconds`}{" "}
          </h4>
        </BaseModal>
      )}
    </>
  );
};
