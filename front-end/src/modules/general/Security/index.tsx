"use client";
//default imports
import React, { useEffect, useState } from "react";
import { fetchSecurity } from "./security.functions";
import BaseModal from "@/components/BaseModal";
import { useLoaderContext } from "@/context/useLoader";

export default function Security({ display, onClose }: any) {
  const [securityContent, setSecurityContent] = useState<any>(null);

  useEffect(() => {
    getTermsAndConditions();
  }, []);

  const { loader, setLoader }: any = useLoaderContext();

  async function getTermsAndConditions() {
    setLoader(true); // Start loader
    try {
      const data = await fetchSecurity();
      setSecurityContent(data);
    } catch (error) {
      console.error("Error fetching terms and conditions:", error);
    } finally {
      setLoader(false); // Stop loader
    }
  }
  //render Template
  return (
    <BaseModal
      title={"Security"}
      displayModal={display}
      onClose={onClose}
      hideSecondButton
      firstButtonName={"Close"}
    >
      {securityContent ? (
        <div dangerouslySetInnerHTML={{ __html: securityContent }} />
      ) : (
        <p>Loading...</p> // Placeholder while loader is active
      )}
    </BaseModal>
  );
}
