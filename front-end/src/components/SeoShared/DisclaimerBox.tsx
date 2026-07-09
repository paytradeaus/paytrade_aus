import React from "react";
import { TRUSTEE_DISCLAIMER } from "./schema";

export default function DisclaimerBox({ text }: { text?: string }) {
  return (
    <div
      className="pt_box"
      style={{ padding: "1rem 1.25rem", margin: "1.5rem 0" }}
    >
      <p style={{ margin: 0, fontSize: "0.9rem" }}>
        <strong>Disclaimer:</strong> {text || TRUSTEE_DISCLAIMER}
      </p>
    </div>
  );
}
