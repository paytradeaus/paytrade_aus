//default imports
import React from "react";
//import from external libraries
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
//import from constants, interfaces ,functions and services
//module level constants and interfaces
interface InvisibleReCaptchaProps {
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  verifyButtonRef: React.RefObject<HTMLButtonElement>;
}

/**
 * Wrapper component for Google reCAPTCHA functionality.
 * This component handles the verification process and provides a button trigger for executing reCAPTCHA.
 *
 * @param  props - The component props.
 * @param  props.onVerify - Callback function invoked when reCAPTCHA verification is successful. Receives the reCAPTCHA token as an argument.
 * @param  props.onError - Optional callback function invoked when reCAPTCHA verification fails.
 * @param  props.verifyButtonRef - Ref object for the verification button.
 * @returns The GoogleRecaptchaWrapper component.
 */
function GoogleRecaptchaWrapper({
  onVerify,
  onError,
  verifyButtonRef,
}: Readonly<InvisibleReCaptchaProps>) {
  const { executeRecaptcha } = useGoogleReCaptcha();

  /**
   * Event handler function to execute reCAPTCHA verification.
   * Calls the verification function when the verification button is clicked or the form is submitted.
   */
  function handleReCaptchaVerify() {
    if (!executeRecaptcha) {
      if (process.env.NODE_ENV === "development") {
        console.log("Dev mode: skipping reCAPTCHA verification");
        onVerify("dev-bypass-token");
        return;
      }
      console.log("Execute recaptcha not yet available");
      onError?.("reCAPTCHA verification is not available. Please try again.");
      return;
    }

    executeRecaptcha("formSubmit")
      .then((gReCaptchaToken) => {
        onVerify(gReCaptchaToken);
      })
      .catch((error) => {
        console.error("reCAPTCHA error:", error);
        if (process.env.NODE_ENV === "development") {
          console.log("Dev mode: bypassing reCAPTCHA after error");
          onVerify("dev-bypass-token");
          return;
        }
        onError?.("reCAPTCHA error occurred. Please try again.");
      });
  }

  //Render Template
  return (
    // Render a hidden button to trigger reCAPTCHA verification
    <button
      ref={verifyButtonRef}
      onClick={() => handleReCaptchaVerify()}
      className="displayNone"
    />
  ); // This component doesn't render anything visible on the page
}

export default GoogleRecaptchaWrapper;
