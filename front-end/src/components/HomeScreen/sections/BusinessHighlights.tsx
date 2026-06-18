"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  BUTTON_EXPLORE_FEATURES_TEXT,
  HIGHLIGHTS_SUBTITLE,
  HIGHLIGHTS_TITLE,
} from "../homeScreen.constants";

export default function BusinessHighlights() {
  useEffect(() => {
    import("@lottiefiles/lottie-player");
  }, []);

  return (
    <div className="pt_highlights">
      <div className="pt_highlightsinner">
        <div className="container-fluid">
          <div className="center">
            <h3>{HIGHLIGHTS_TITLE}</h3>
            <p>{HIGHLIGHTS_SUBTITLE}</p>
          </div>
          <div className="grid">
            <div className="pt_highlightbox">
              <lottie-player
                autoplay
                loop
                mode="normal"
                src="/json/rbicons/coins.json"
              ></lottie-player>
              <h4>Pay or get paid</h4>
              <p>
                Send and receive payment claims, process payments and issue
                notices all whilst ensuring compliance with the project trust
                framework.
              </p>
            </div>
            <div className="pt_highlightbox">
              <lottie-player
                autoplay
                loop
                mode="normal"
                src="/json/rbicons/finance.json"
              ></lottie-player>
              <h4>Connected bank data</h4>
              <p>
                Connect your bank general account, project and retention trust
                accounts for real-time data.
              </p>
            </div>
            <div className="pt_highlightbox">
              <lottie-player
                autoplay
                loop
                mode="normal"
                src="/json/rbicons/planning.json"
              ></lottie-player>
              <h4>Smart transaction matching</h4>
              <p>
                Our smart software can find the closest matches for your
                transactions speeding up your audit process.
              </p>
            </div>
            <div className="pt_highlightbox">
              <lottie-player
                autoplay
                loop
                mode="normal"
                src="/json/rbicons/success.json"
              ></lottie-player>
              <h4>Trust account</h4>
              <p>Automate your trust accounts and reconciliation processes.</p>
            </div>
          </div>
          <div className="pt_highlightscta">
            <div className="pt_highlightsctatext">
              <h4>Explore all our features</h4>
              <p>
                Everything you need to ensure you are fully compliant with the
                project trust framework
              </p>
            </div>
            <div className="pt_highlightsctabutton">
              <Link href={"/features"}>
                <button className="contrast">
                  {BUTTON_EXPLORE_FEATURES_TEXT}
                  <i className="fa-light fa-arrow-right right"></i>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
