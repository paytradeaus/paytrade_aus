"use client";
//default imports
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
//import from reactstrap components
//import from customized components
import { FullScreenModal } from "@/components/FullScreenModal/FullScreenModal";
import { fetchTermsAndConditions } from "./termsAndConditions.function";
//import customized styles
//import from external libraries
//import from constants, interfaces ,functions and services
//module level constants and interfaces

export default function TermsAndConditions() {
  //useState and useEffect Management
  const [isFullScreenModalDisplay, setIsFullScreenModalDisplay] =
    useState(true);
  const [termsAndConditionsContent, setTermsAndConditionsContent] =
    useState<any>(null);

  useEffect(() => {
    getTermsAndConditions();
  }, []);
  //other Hooks
  const router = useRouter();
  //Formik Handling

  //functions
  function handleNavigation() {
    setIsFullScreenModalDisplay(false);
    router.back();
  }

  async function getTermsAndConditions() {
    await fetchTermsAndConditions().then((data: any) => {
      setTermsAndConditionsContent(data);
    });
  }
  //render Template
  return (
    <FullScreenModal
      displayFullScreenModal={isFullScreenModalDisplay}
      onClose={() => handleNavigation()}
    >
      <div dangerouslySetInnerHTML={{ __html: termsAndConditionsContent }} />
    </FullScreenModal>
  );
}
