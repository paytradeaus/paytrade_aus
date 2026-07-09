import React from "react";
import Link from "next/link";
import { COMPARISON_HUB_PATH, COMPETITORS } from "./comparisonData";

export default function RelatedComparisonLinks({
  currentPath,
  heading = "Related comparisons",
}: {
  currentPath: string;
  heading?: string;
}) {
  const path = `/${currentPath.replace(/^\//, "")}`;
  const links: { href: string; label: string }[] = [
    { href: `/${COMPARISON_HUB_PATH}`, label: "Compare project trust account software" },
    ...COMPETITORS.flatMap((competitor) => [
      { href: `/${competitor.vsPath}`, label: `PayTrade vs ${competitor.name}` },
      { href: `/${competitor.alternativePath}`, label: `${competitor.name} alternative` },
    ]),
  ].filter((link) => link.href !== path);

  return (
    <section>
      <h2>{heading}</h2>
      <ul>
        {links.map((link, index) => (
          <li key={index}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
