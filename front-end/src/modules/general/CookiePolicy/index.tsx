"use client";
//default imports
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BaseModal from "@/components/BaseModal";
import { fetchCookiesPolicy } from "./cookiePolicy.function";
import { useLoaderContext } from "@/context/useLoader";
export default function CookiePolicyModal({ display, onClose }: any) {
  const [cookiesPolicy, setCookiesPolicy] = useState<any>(null);

  useEffect(() => {
    getTermsAndConditions();
  }, []);
  //other Hooks
  const router = useRouter();
  const { loader, setLoader }: any = useLoaderContext();

  //Formik Handling

  //functions
  function handleNavigation() {
    router.back();
  }

  async function getTermsAndConditions() {
    setLoader(true); // Start loader
    try {
      const data = await fetchCookiesPolicy();
      setCookiesPolicy(data);
    } catch (error) {
      console.error("Error fetching terms and conditions:", error);
    } finally {
      setLoader(false); // Stop loader
    }
  }
  return (
    <BaseModal
      title={"Cookie Policy"}
      displayModal={display}
      onClose={onClose}
      hideSecondButton
      firstButtonName={"Close"}
    >
      {cookiesPolicy ? (
        <div dangerouslySetInnerHTML={{ __html: cookiesPolicy }} />
      ) : (
        <p>Loading...</p> // Placeholder while loader is active
      )}
    </BaseModal>
  );
}
