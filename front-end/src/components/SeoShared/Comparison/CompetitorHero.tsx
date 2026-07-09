import React from "react";
import Link from "next/link";
import LastReviewed from "../LastReviewed";

export default function CompetitorHero({
  h1,
  paragraphs,
  lastReviewed,
  ctas,
}: {
  h1: string;
  paragraphs: string[];
  lastReviewed: string;
  ctas?: { href: string; label: string; outline?: boolean }[];
}) {
  return (
    <header>
      <h1>{h1}</h1>
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
      <LastReviewed date={lastReviewed} />
      {ctas?.length ? (
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", margin: "1rem 0" }}>
          {ctas.map((cta, index) => (
            <Link key={index} href={cta.href}>
              <button className={cta.outline ? "contrast outline" : undefined}>
                {cta.label}
              </button>
            </Link>
          ))}
        </div>
      ) : null}
    </header>
  );
}
