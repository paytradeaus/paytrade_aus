import React from "react";
import Link from "next/link";
import { GOV_LISTING_STATEMENT } from "../schema";

export default function EvidenceProofSection({
  heading = "PayTrade's evidence and proof points",
}: {
  heading?: string;
}) {
  return (
    <section>
      <h2>{heading}</h2>
      <p>{GOV_LISTING_STATEMENT}</p>
      <ul>
        <li>
          Two-way Xero integration covering bank account, contact, project and
          contract mapping — see{" "}
          <Link href="/xero-project-trust-account-software">
            Xero project trust account software
          </Link>
          .
        </li>
        <li>
          Audit-ready record structure connecting project, contract,
          beneficiary, payment claim, trust bank account, ledger,
          reconciliation and supporting documents — see{" "}
          <Link href="/audit-ready-project-trust-account-software">
            audit-ready project trust account software
          </Link>
          .
        </li>
        <li>
          Project trust and retention trust administration in one focused
          system — see{" "}
          <Link href="/retention-trust-account-software">
            retention trust account software
          </Link>
          .
        </li>
        <li>
          Transparent plans on the <Link href="/pricing">pricing page</Link>{" "}
          and answers on the <Link href="/faq">FAQ page</Link>.
        </li>
      </ul>
    </section>
  );
}
