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
    //Functions
    // Check if executeRecaptcha function is available
    if (!executeRecaptcha) {
      console.log("Execute recaptcha not yet available");
      onError?.("reCAPTCHA verification is not available. Please try again.");
      return;
    }

    executeRecaptcha("formSubmit")
      .then((gReCaptchaToken) => {
        // Call the onVerify callback function with the reCAPTCHA token
        onVerify(gReCaptchaToken);
      })
      .catch((error) => {
        console.error("reCAPTCHA error:", error);
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
