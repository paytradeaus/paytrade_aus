import React from "react";
import Link from "next/link";

/**
 * Internal-linking blocks that funnel authority from the ~60 trust-related
 * programmatic SEO topic pages up to the canonical /project-trust-account
 * guide, and across to the relevant money pages where intent fits.
 */

const CANONICAL_GUIDE_PATH = "/project-trust-account";

type MoneyPageLink = {
  href: string;
  label: string;
  /** lowercase substrings; page is offered when any matches the topic text */
  match: string[];
};

// Ordered by specificity — more specific intents first so the most relevant
// money pages win the (limited) slots.
const MONEY_PAGES: MoneyPageLink[] = [
  {
    href: "/xero-qbcc-trust-accounting-software",
    label: "Xero QBCC trust accounting software",
    match: ["xero"],
  },
  {
    href: "/qbcc-trust-accounting-software",
    label: "QBCC trust accounting software",
    match: ["qbcc"],
  },
  {
    href: "/retention-trust-account-software",
    label: "Retention trust account software",
    match: ["retention"],
  },
  {
    href: "/audit-ready-project-trust-account-software",
    label: "Audit-ready project trust account software",
    match: ["audit"],
  },
  {
    href: "/project-trust-account-reconciliation-software",
    label: "Project trust account reconciliation software",
    match: ["reconcil", "bank statement"],
  },
  {
    href: "/project-trust-account-record-keeping-software",
    label: "Project trust account record keeping software",
    match: ["record", "ledger", "bookkeep"],
  },
  {
    href: "/project-trust-account-software",
    label: "Project trust account software",
    match: ["project trust", "trust account", "trust accounting", "trustee", "beneficiar"],
  },
];

const MAX_MONEY_LINKS = 3;

export function getRelevantMoneyPages(
  ...texts: Array<string | null | undefined>
): MoneyPageLink[] {
  const haystack = texts.filter(Boolean).join(" ").toLowerCase();
  if (!haystack) return [];
  return MONEY_PAGES.filter((page) =>
    page.match.some((m) => haystack.includes(m))
  ).slice(0, MAX_MONEY_LINKS);
}

/**
 * Prominent "Read the complete guide" banner pointing at the canonical
 * /project-trust-account guide. Rendered on every trust-related topic page.
 */
export function GuideCtaBanner() {
  return (
    <aside
      style={{
        padding: "1.25rem 1.5rem",
        margin: "0 0 1.5rem",
        border: "1px solid #c7d7f5",
        borderRadius: "8px",
        background: "#f0f4ff",
      }}
    >
      <h6 style={{ marginBottom: "0.5rem", color: "#1a1a2e" }}>
        New to project trust accounts?
      </h6>
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem" }}>
        This topic is part of a bigger picture. Our complete guide covers what
        a project trust account is, who needs one, and how to stay compliant.
      </p>
      <Link
        href={CANONICAL_GUIDE_PATH}
        style={{ fontWeight: 600, fontSize: "0.9rem", color: "#1a73e8" }}
      >
        Read the complete project trust account guide →
      </Link>
    </aside>
  );
}

/**
 * Cross-links to the money pages that match this topic's intent.
 */
export function MoneyPageLinks({
  texts,
}: {
  texts: Array<string | null | undefined>;
}) {
  const pages = getRelevantMoneyPages(...texts);
  if (pages.length === 0) return null;
  return (
    <aside
      style={{
        padding: "1.25rem 1.5rem",
        margin: "1.5rem 0",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        background: "#fff",
      }}
    >
      <h6 style={{ marginBottom: "0.5rem", color: "#1a1a2e" }}>
        Software for this
      </h6>
      <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
        {pages.map((page) => (
          <li key={page.href} style={{ margin: "0.35rem 0" }}>
            <Link
              href={page.href}
              style={{ fontWeight: 600, fontSize: "0.9rem", color: "#1a73e8" }}
            >
              {page.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
