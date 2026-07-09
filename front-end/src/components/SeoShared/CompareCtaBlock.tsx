import React from "react";
import Link from "next/link";

const RELEVANCE_KEYWORDS = [
  "trust account",
  "trust accounting",
  "project trust",
  "retention trust",
  "qbcc",
  "xero",
  "audit",
  "reconcil",
  "beneficiar",
  "retention",
  "bank statement",
  "trustee",
];

export function isTrustAccountRelated(...texts: Array<string | null | undefined>) {
  const haystack = texts
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!haystack) return false;
  return RELEVANCE_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

export default function CompareCtaBlock() {
  return (
    <aside
      className="pt_box"
      style={{
        padding: "1.25rem 1.5rem",
        margin: "1.5rem 0",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        background: "#f9fafb",
      }}
    >
      <h6 style={{ marginBottom: "0.5rem" }}>
        Comparing trust account software?
      </h6>
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem" }}>
        See how PayTrade compares for project trust accounts, retention
        trusts, Xero integration, audit trails and reconciliation.
      </p>
      <Link
        href="/compare/project-trust-account-software"
        style={{ fontWeight: 600, fontSize: "0.9rem" }}
      >
        Compare project trust account software →
      </Link>
    </aside>
  );
}
