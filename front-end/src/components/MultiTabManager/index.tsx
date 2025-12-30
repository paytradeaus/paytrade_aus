"use client";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { clearBrowserStorage } from "@/utils";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

export default function MultiTabManager() {
  const router = useRouter();
  useEffect(() => {
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === "auth-logout" && event.newValue === "true") {
        clearBrowserStorage();
        router.push(AppRoutes.HOME);
      }
    };

    window.addEventListener("storage", handleStorageEvent);

    return () => window.removeEventListener("storage", handleStorageEvent);
  }, []);

  return null;
}
