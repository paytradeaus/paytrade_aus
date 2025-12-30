"use client";
import BaseModal from "@/components/BaseModal";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchTermsAndConditions } from "./termsAndConditions.functions";
import { useLoaderContext } from "@/context/useLoader";

export default function TermsConditionsModal({ display, onClose }: any) {
  const [termsAndConditionsContent, setTermsAndConditionsContent] =
    useState<any>(null);

  useEffect(() => {
    getTermsAndConditions();
  }, []);
  //other Hooks
  const { loader, setLoader }: any = useLoaderContext();
  const router = useRouter();
  //Formik Handling

  //functions
  function handleNavigation() {
    router.back();
  }

  async function getTermsAndConditions() {
    setLoader(true); // Start loader
    try {
      const data = await fetchTermsAndConditions();
      setTermsAndConditionsContent(data);
    } catch (error) {
      console.error("Error fetching terms and conditions:", error);
    } finally {
      setLoader(false); // Stop loader
    }
  }

  return (
    <BaseModal
      title={"  Terms And Conditions"}
      displayModal={display}
      onClose={onClose}
      hideSecondButton
      firstButtonName={"Close"}
    >
      {termsAndConditionsContent ? (
        <div dangerouslySetInnerHTML={{ __html: termsAndConditionsContent }} />
      ) : (
        <p>Loading...</p> // Placeholder while loader is active
      )}
    </BaseModal>
  );
}
