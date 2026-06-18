"use client";

import Link from "next/link";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  BUTTON_SIGNUP_TEXT,
  HOME_LAST_DESC,
  HOME_LAST_HEADING,
  HOME_LAST_SUBHEAD,
} from "../homeScreen.constants";

export default function FinalCta() {
  return (
    <div>
      <div className="container-fluid">
        <div className="finalcta center">
          <div className="logolarge"></div>
          <br />
          <br />
          <h5>{HOME_LAST_HEADING}</h5>
          <div className="pt_highlightscta">
            <div className="pt_highlightsctatext">
              <h3 className="crabtext">{HOME_LAST_SUBHEAD}</h3>
              <p>{HOME_LAST_DESC}</p>
            </div>
            <div className="pt_highlightsctabutton">
              <Link href={AppRoutes.USER_LOGIN} className="cta">
                <button>
                  {BUTTON_SIGNUP_TEXT}
                  <i className="fa-light fa-arrow-right right"></i>
                </button>
              </Link>
            </div>
          </div>
          <div className="blurblobthemecta"></div>
        </div>
      </div>
    </div>
  );
}
