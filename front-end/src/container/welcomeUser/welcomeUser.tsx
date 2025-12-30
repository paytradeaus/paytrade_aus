//default imports
import { AppModal } from "@/components/model/model";
import React, { useEffect, useState } from "react";
//import from reactstrap components
//import from customized components
//import customized styles
import styles from "./welcomeUser.module.scss";
//import from external libraries
import { getCookie, setCookie } from "cookies-next";
import {
  AUSTRALIA,
  UNITED_KINGDOM,
} from "@/common/constants/identificationNumbers";
import { PAY_TRADE_UK_SITE } from "@/common/constants/general";
//import from constants, interfaces ,functions and services
//module level constants and interfaces

const ONE_YEAR = 365;
const expires = ONE_YEAR * 24 * 60 * 60;
interface SelectedValueProps {
  value: number;
  label: string;
}

const countryList = [
  { value: AUSTRALIA, label: "Australia - paytrade.app/AU" },
  { value: UNITED_KINGDOM, label: "United Kingdom - paytrade.app/UK" },
];

export const WelcomeUser = ({
  displayWelcomeModal = true,
  displayAcceptCookiesMOdal,
  onWelcomeModalClose,
  onCookiesModalClose,
}: any) => {
  //useState and useEffect Management
  const [selectedCountry, setSelectedCountry] = useState<number>(0);

  //other Hooks

  //Formik Handling

  //functions
  function handleSelect(selectedObj: any) {
    setSelectedCountry(selectedObj?.value);
    if (selectedObj?.value === UNITED_KINGDOM) {
      window.open(PAY_TRADE_UK_SITE, "_blank");
    } else {
      handleConfirmation(selectedObj?.value);
      onWelcomeModalClose(false);
    }
  }

  function handleConfirmation(country: string) {
    setCookie("country", country, {
      maxAge: expires,
    });

    onCookiesModalClose(false);
  }

  //Render Template
  return (
    <AppModal
      // show={displayWelcomeModal || displayAcceptCookiesMOdal}
      show={displayWelcomeModal}
      onHide={() => {}}
      // firstButtonLabel={displayWelcomeModal ? "" : "Accept All"}
      firstButtonStyle={styles.confirmButton}
      // secondButtonLabel={displayWelcomeModal ? "" : "Reject All"}
      secondButtonStyle={styles.cancelButton}
      // ThirdButtonLabel={displayWelcomeModal ? "" : "Customize All"}
      thirdButtonStyle={styles.cancelButton}
      modalTitleStyle={styles.ModelHeaderTitle}
      // modalHeading={
      //   displayWelcomeModal ? "Welcome to Pay Trade" : "We value your privacy"
      // }
      modalHeading={"Welcome to Pay Trade"}
      modalBodyTitle=""
      // modalBodyContent={
      //   displayWelcomeModal
      //     ? "Please select your location to utilise the tools and products specifically designed for your country."
      //     : "we use cookies to enhance your browsing experience, service personalized ads or content, and analyse our traffic. By clicking Accept All, you consent to our use of cookies"
      // }
      modalBodyContent={
        "Please select your location to utilise the tools and products specifically designed for your country."
      }
      displaySelect={displayWelcomeModal}
      select={{
        options: countryList,
        onChange: (selectedObj: SelectedValueProps) =>
          handleSelect(selectedObj),
        value: selectedCountry,
        placeholder: "Select Country",
      }}
      // onConfirm={handleConfirmation}
    />
  );
};
