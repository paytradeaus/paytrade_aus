"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BUTTON_TUTORIALS_TEXT } from "../homeScreen.constants";

export default function OnboardingSupport() {
  useEffect(() => {
    import("@lottiefiles/lottie-player");
  }, []);

  return (
    <div className="container-fluid">
      <div className="pt_split">
        <div className="grid">
          <div className="pt_splitimage">
            <lottie-player
              autoplay
              loop
              mode="normal"
              src="/json/bankservice.json?v=1"
            ></lottie-player>
          </div>
          <div className="pt_splittext">
            <h2>Free onboarding session</h2>
            <h4>Get up and running easily with free support</h4>
            <p>
              Check out our video tutorials and guides or contact our support
              team who can schedule a free support call to help your onboarding.
            </p>
            <p>
              <b>New to PayTrade?</b> Once you&apos;ve signed up, raise a support
              ticket and book a free 45-minute onboarding session with our
              experts. They will walk you through the setup and everything you
              need to get setup and where needed, onboard your existing data.
            </p>
            <br />
            <Link href={"/how-to-guides"}>
              <button className="secondary">
                <i className="fa-light fa-film"></i>
                {BUTTON_TUTORIALS_TEXT}
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
