"use client";
//default imports
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
//import from reactstrap components
//import from customized components
import { FullScreenModal } from "@/components/FullScreenModal/FullScreenModal";
import { fetchPrivacyPolicy } from "./privacyPolicy.function";
//import customized styles
//import from external libraries
//import from constants, interfaces ,functions and services
//module level constants and interfaces

export default function PrivacyPolicy() {
  //useState and useEffect Management
  const [isFullScreenModalDisplay, setIsFullScreenModalDisplay] =
    useState(true);
  const [privacyContent, setPrivacyContent] = useState<any>(null);

  useEffect(() => {
    getPrivacyPolicy();
  }, []);
  //other Hooks
  const router = useRouter();
  //Formik Handling

  //functions
  function handleNavigation() {
    setIsFullScreenModalDisplay(false);
    router.back();
  }

  async function getPrivacyPolicy() {
    await fetchPrivacyPolicy().then((data: any) => {
      setPrivacyContent(data);
    });
  }

  //render Template
  return (
    <FullScreenModal
      displayFullScreenModal={isFullScreenModalDisplay}
      onClose={() => handleNavigation()}
    >
      <div dangerouslySetInnerHTML={{ __html: privacyContent }} />
    </FullScreenModal>
  );
}
