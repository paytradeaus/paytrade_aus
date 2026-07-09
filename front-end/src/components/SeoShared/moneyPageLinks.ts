export const MONEY_PAGE_LINKS = [
  {
    href: "/project-trust-account-software",
    label: "Project trust account software",
  },
  {
    href: "/qbcc-trust-accounting-software",
    label: "QBCC trust accounting software",
  },
  {
    href: "/xero-project-trust-account-software",
    label: "Xero project trust account software",
  },
  {
    href: "/xero-qbcc-trust-accounting-software",
    label: "Xero QBCC trust accounting software",
  },
  {
    href: "/retention-trust-account-software",
    label: "Retention trust account software",
  },
  {
    href: "/audit-ready-project-trust-account-software",
    label: "Audit-ready project trust account software",
  },
  {
    href: "/project-trust-account-record-keeping-software",
    label: "Project trust account record keeping software",
  },
  {
    href: "/project-trust-account-reconciliation-software",
    label: "Project trust account reconciliation software",
  },
];

export function relatedLinksFor(currentPath: string) {
  const path = `/${currentPath.replace(/^\//, "")}`;
  return [
    ...MONEY_PAGE_LINKS.filter((link) => link.href !== path),
    { href: "/pricing", label: "PayTrade pricing" },
    { href: "/faq", label: "Frequently asked questions" },
    { href: "/get-support", label: "Contact us for a demo" },
  ];
}
