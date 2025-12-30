"use client";
import BaseModal from "@/components/BaseModal";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchPrivacyPolicy } from "./privacyPolicy.functions";
import { useLoaderContext } from "@/context/useLoader";
export default function PrivacyPolicyModal({ display, onClose }: any) {
  const [privacyContent, setPrivacyContent] = useState<any>(null);

  useEffect(() => {
    getPrivacyPolicy();
  }, []);
  //other Hooks
  const router = useRouter();
  const { loader, setLoader }: any = useLoaderContext();

  //Formik Handling

  //functions
  function handleNavigation() {
    router.back();
  }

  async function getPrivacyPolicy() {
    setLoader(true); // Start loader
    try {
      const data = await fetchPrivacyPolicy();
      setPrivacyContent(data);
    } catch (error) {
      console.error("Error fetching terms and conditions:", error);
    } finally {
      setLoader(false); // Stop loader
    }
  }
  return (
    <BaseModal
      title={"Privacy Policy"}
      displayModal={display}
      onClose={onClose}
      hideSecondButton
      firstButtonName={"Close"}
    >
      {privacyContent ? (
        <div dangerouslySetInnerHTML={{ __html: privacyContent }} />
      ) : (
        <p>Loading...</p> // Placeholder while loader is active
      )}
    </BaseModal>
  );
}
