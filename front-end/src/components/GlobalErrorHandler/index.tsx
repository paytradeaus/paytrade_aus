"use client";

import { useEffect } from "react";

export default function GlobalErrorHandler() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && typeof event.reason === "object" && event.reason instanceof Error) {
        return;
      }
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      const src = event.filename || "";
      if (
        src.includes("cookiebot") ||
        src.includes("googletagmanager") ||
        src.includes("gtag") ||
        src.includes("stripe") ||
        src.includes("consent.cookiebot")
      ) {
        event.preventDefault();
        return;
      }

      if (!event.error) {
        event.preventDefault();
        return;
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null;
}
