"use client";
import CustomButton from "@/components/CustomButton/CustomButton";
import { buttonType } from "@/shared/constant/general";
import React, { useEffect, useRef } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const reportedRef = useRef(false);

  useEffect(() => {
    if (reportedRef.current) return;
    reportedRef.current = true;
    try {
      const companyId =
        typeof window !== "undefined"
          ? localStorage.getItem("companyId") ||
            localStorage.getItem("UserCompanyId") ||
            undefined
          : undefined;
      fetch("/support-ticket/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error?.message || String(error) || "Unknown client error",
          stack: error?.stack || undefined,
          digest: error?.digest || undefined,
          url: typeof window !== "undefined" ? window.location.href : undefined,
          companyId: companyId || undefined,
        }),
        keepalive: true,
      }).catch(() => {
        // Reporting must never cause a secondary failure.
      });
    } catch {
      // Ignore - error reporting is best-effort.
    }
  }, [error]);

  function resetHandler() {
    reset();
  }

  return (
    <html>
      <body>
        <div className="error-page">
          <h1>Oops!</h1>
          <p>Looks like we have a system error.</p>
          <p>
            This error has been auto-logged with our team who will look into
            this right away.
          </p>
          <p>Sorry for any inconvenience.</p>
          <p>
            <small>
              {`Error details: ${error?.message ? error.message : "Not available"}`}
            </small>
          </p>
          <CustomButton
            actionType={"button"}
            buttonName={"Try again"}
            buttonType={buttonType.PRIMARY}
            onClick={resetHandler}
          />
        </div>
      </body>
    </html>
  );
}
