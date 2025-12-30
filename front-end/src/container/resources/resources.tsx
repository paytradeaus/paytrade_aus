"use client";
//default imports
import React, { useState } from "react";
import { useRouter } from "next/navigation";
//import from reactstrap components
//import from customized components
import { FullScreenModal } from "@/components/FullScreenModal/FullScreenModal";
//import customized styles
//import from external libraries
//import from constants, interfaces ,functions and services
//module level constants and interfaces

export default function Resources() {
  //useState and useEffect Management
  const [isFullScreenModalDisplay, setIsFullScreenModalDisplay] =
    useState(true);
  //other Hooks
  const router = useRouter();
  //Formik Handling

  //functions
  function handleNavigation() {
    setIsFullScreenModalDisplay(false);
    router.back();
  }
  //render Template
  return (
    <FullScreenModal
      displayFullScreenModal={isFullScreenModalDisplay}
      onClose={() => handleNavigation()}
    >
      <div>
        <h5>Resources Content</h5>
        {/* <div className={customStyles.subTitle}>General terms and conditions</div>
      <div>
        General Terms and Conditions of Pay-Trade Limited for the Use of the
        Digital Escrow Service Pay-Trade
      </div> */}
      </div>
    </FullScreenModal>
  );
}
