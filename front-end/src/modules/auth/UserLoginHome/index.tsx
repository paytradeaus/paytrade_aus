"use client";
import { useIsClient } from "@/hooks";
import AuthLayout from "@/modules/auth/AuthLayout";
import LoginForm from "@/modules/auth/LoginForm";
import SignUpForm from "@/modules/auth/SignUpForm";
import { updateUserMode } from "@/redux/slices/userModeSlice";
import { setAppUserDetails } from "@/redux/slices/userRegistrationSlice";
import { useAppDispatch } from "@/redux/store";
import { clearBrowserStorage } from "@/utils";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

export default function UserLoginHome() {
  const { isClient }: any = useIsClient();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  function onSignOut() {
    dispatch(updateUserMode(null));
    clearBrowserStorage();
    dispatch(setAppUserDetails({}));
  }

  useEffect(() => {
    if (isClient) {
      const fromParam = searchParams.get("from");
      if (fromParam === "mail") {
        onSignOut();
      }
    }
  }, [isClient, searchParams]);

  if (!isClient) return null; // Avoid mismatches during hydration

  return (
    <Suspense>
      <AuthLayout>
        <div className="pt_box_transparent">
          <div className="grid">
            <LoginForm />
            <SignUpForm />
          </div>
        </div>
      </AuthLayout>
    </Suspense>
  );
}
