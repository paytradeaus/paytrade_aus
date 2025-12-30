"use client";
import BaseModal from "@/components/BaseModal";
import CustomButton from "@/components/CustomButton/CustomButton";
import { buttonType } from "@/shared/constant/general";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.log("GlobalError mounted");
    return () => {
      console.log("GlobalError unmounted");
    };
  }, []);

  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(true);

  function resetHandler() {
    console.log("Attempting to recover from error");
    reset();
  }

  const handleRefresh = () => {
    console.log("Refreshing the page");
    window.location.reload();
  };

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
              {`Error details: ${error ? error : "Not available"}`}
              {/* Display error details */}
            </small>
          </p>
          {/* <button onClick={resetHandler} className="reload-button">
            Reload Page
          </button> */}
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
