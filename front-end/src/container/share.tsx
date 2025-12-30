"use client";
import React, { useEffect, useState } from "react";
import {
  FacebookIcon,
  FacebookShareButton,
  LinkedinIcon,
  LinkedinShareButton,
  TwitterIcon,
  TwitterShareButton,
} from "react-share";

export default function Share() {
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    setShareUrl(window?.location?.href);
  }, []);

  return (
    <div>
      <FacebookShareButton url={shareUrl} windowWidth={600} windowHeight={400}>
        <FacebookIcon size={32} round={true} />
      </FacebookShareButton>
      <TwitterShareButton url={shareUrl}>
        <TwitterIcon size={32} round={true} />
      </TwitterShareButton>
      <LinkedinShareButton url={shareUrl} windowWidth={600} windowHeight={500}>
        <LinkedinIcon size={32} round={true} />
      </LinkedinShareButton>
    </div>
  );
}
