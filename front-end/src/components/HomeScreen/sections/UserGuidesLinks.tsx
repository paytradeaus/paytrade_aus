"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function UserGuidesLinks() {
  useEffect(() => {
    import("@lottiefiles/lottie-player");
  }, []);

  return (
    <div className="pt_links">
      <div className="pt_linksinner">
        <div className="container-fluid">
          <div className="center">
            <h3>User Guides</h3>
            <p>
              Let us take you step by step through our process to keep you
              compliant and produce your trust accounts with ease
            </p>
          </div>
          <div className="grid">
            <Link className="pt_linksbox" href="/how-to-guides">
              <lottie-player
                autoplay
                loop
                mode="normal"
                src="/json/rbicons/graduationhat.json"
              ></lottie-player>
              <h4 className="oceantext">Get setup with PayTrade</h4>
              <p>
                Learn how to setup your account and get started with PayTrade
              </p>
            </Link>
            <Link href={"/community"} className="pt_linksbox">
              <lottie-player
                autoplay
                loop
                mode="normal"
                src="/json/rbicons/users.json"
              ></lottie-player>
              <h4 className="oceantext">Our community</h4>
              <p>Ask questions and share product and industry insights</p>
            </Link>
            <Link href={"/blog"} className="pt_linksbox">
              <lottie-player
                autoplay
                loop
                mode="normal"
                src="/json/rbicons/book.json"
              ></lottie-player>
              <h4 className="oceantext">Project trust blog</h4>
              <p>
                Keep track of industry updates related to project trusts on our
                blog
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
