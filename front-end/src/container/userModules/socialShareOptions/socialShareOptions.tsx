"use client";
//default imports
import React, { Fragment, useEffect, useState } from "react";
//import from reactstrap components and icons
import { Facebook, Linkedin, Twitter } from "react-bootstrap-icons";
//import from customized components
//import customized styles
import customStyles from "./socialShareOptions.module.scss";
//import from external libraries
import {
  FacebookShareButton,
  TwitterShareButton,
  LinkedinShareButton,
} from "react-share";
//import from constants, interfaces ,functions and services
//module level constants and interfaces
const WINDOW_HEIGHT = 400;
const WINDOW_WIDTH = 600;

/**
 * Renders social share buttons for Facebook, Twitter, and LinkedIn.
 *
 * @returns A React fragment containing the social share buttons.
 */
export default function SocialShareOptions() {
  //useState and useEffect Management

  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    //current route location path
    setShareUrl(window?.location?.href);
  }, []);

  return (
    <Fragment>
      {/* Facebook share button */}
      <FacebookShareButton
        url={shareUrl}
        className={customStyles.shareIcon}
        windowWidth={WINDOW_WIDTH}
        windowHeight={WINDOW_HEIGHT}
      >
        <Facebook size={32} />
      </FacebookShareButton>

      {/* Twitter share button */}
      <TwitterShareButton
        url={shareUrl}
        className={customStyles.shareIcon}
        windowWidth={WINDOW_WIDTH}
        windowHeight={WINDOW_HEIGHT}
      >
        <Twitter size={32} />
      </TwitterShareButton>

      {/* LinkedIn share button */}
      <LinkedinShareButton
        url={shareUrl}
        className={customStyles.shareIcon}
        windowWidth={WINDOW_WIDTH}
        windowHeight={WINDOW_HEIGHT}
      >
        <Linkedin size={32} />
      </LinkedinShareButton>
    </Fragment>
  );
}
