"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "@/app/Toaster";
import { AppModal } from "@/components/model/model";
import { clearALLCookies } from "@/common/commonFunctions";
import { ApplicationURLS } from "@/common/applicationURLS";
import { NO_aCTIVITY_DETECTED } from "@/common/constants/messages";
import { useAppDispatch } from "@/redux/store";
import { updateUserMode } from "@/redux/slices/userModeSlice";
import { setAppUserDetails } from "@/redux/slices/userRegistrationDetails";
import { triggerActivityLogAfterAnUserIsSignedOut } from "@/app/api/commonAPIs";
import { ALL_ADMIN_ROLES } from "@/common/constants/roles";
import { useTokenDetails } from "@/common/commonHooks";
import { useLoaderContext } from "@/context/useLoader";

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

  useEffect(() => {
    if (decodeTokenData) {
      // Add event listeners to track user activity
      const handleUserActivity = () => {
        lastActivityTime = Date.now(); // Reset last activity time
      };

      window.addEventListener("mousemove", handleUserActivity);
      window.addEventListener("keypress", handleUserActivity);
      window.addEventListener("click", handleUserActivity);
      window.addEventListener("scroll", handleUserActivity);

      // Start the idle monitoring interval
      const idleMonitor = setInterval(() => monitorIdleTime(), 1000);

      // Cleanup on component unmount
      return () => {
        window.removeEventListener("mousemove", handleUserActivity);
        window.removeEventListener("keypress", handleUserActivity);
        window.removeEventListener("click", handleUserActivity);
        window.removeEventListener("scroll", handleUserActivity);
        clearInterval(idleMonitor);
      };
    }
  }, [routePath]);

  const monitorIdleTime = () => {
    const currentTime = Date.now();
    const elapsedTime = currentTime - lastActivityTime;
    // console.log(elapsedTime, "elapsedTime");

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
      await triggerActivityLogAfterAnUserIsSignedOut(payload);
    }

    clearALLCookies();
    new BroadcastChannel("auth-channel").postMessage({ type: "LOGOUT", tabId });
    dispatch(setAppUserDetails({}));
    dispatch(updateUserMode(null));
    if (ALL_ADMIN_ROLES.includes(decodeTokenData?.role)) {
      router.push(ApplicationURLS.ADMIN_LOGIN);
    } else {
      router.push(ApplicationURLS.USER_LOGIN);
    }

    !clickedLogout && toast.success(NO_aCTIVITY_DETECTED);
  };

  const closeAutoLogoutModal = () => {
    setDisplayAutoLogoutModal(false);
    setSeconds(WARNING_TIME / 1000); // Reset countdown
  };

  return (
    <AppModal
      show={displayAutoLogoutModal}
      onHide={() => signOut(true)}
      secondButtonLabel="Logout"
      firstButtonLabel="I am still working"
      modalHeading={`Auto logout in ${seconds} seconds`}
      modalBodyContent=""
      onConfirm={closeAutoLogoutModal}
    />
  );
};
