import React from "react";
import Link from "next/link";

export default function DemoCTA({
  heading = "See PayTrade in action",
  description = "Sign up for free or contact us to see how PayTrade handles project trust account administration end to end.",
}: {
  heading?: string;
  description?: string;
}) {
  return (
    <div className="pt_box" style={{ margin: "2rem 0", padding: "1.5rem" }}>
      <div className="pt_tool">
        <div className="pt_tooltext">
          <h4>{heading}</h4>
          <p>{description}</p>
        </div>
        <div className="pt_toolbutton" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href="/user/login">
            <button>
              <i className="fa-light fa-user-plus"></i> Sign up for free
            </button>
          </Link>
          <Link href="/get-support">
            <button className="contrast outline">
              Contact us for a demo
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
