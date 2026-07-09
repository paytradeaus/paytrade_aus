"use client";

import Link from "next/link";

const LINKS = [
  {
    href: "/project-trust-account-software",
    title: "Project trust account software",
    description:
      "Audit-first project trust account administration for Queensland builders",
  },
  {
    href: "/xero-project-trust-account-software",
    title: "Xero project trust account software",
    description:
      "Xero-connected trust workflows: bank account, contact, project and contract mapping",
  },
  {
    href: "/audit-ready-project-trust-account-software",
    title: "Audit-ready trust account software",
    description:
      "Trust ledgers, notices, reconciliation and audit-ready evidence in one place",
  },
  {
    href: "/compare/project-trust-account-software",
    title: "Compare trust account software",
    description:
      "See how PayTrade compares with other Queensland trust account software",
  },
];

export default function TrustSoftwareLinks() {
  return (
    <div className="pt_links">
      <div className="pt_linksinner">
        <div className="container-fluid">
          <div className="center">
            <h3>Trust Account Software</h3>
            <p>
              Explore how PayTrade supports project trust and retention trust
              administration for Queensland construction businesses
            </p>
          </div>
          <div className="grid">
            {LINKS.map((link) => (
              <Link key={link.href} className="pt_linksbox" href={link.href}>
                <h4 className="oceantext">{link.title}</h4>
                <p>{link.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
