import React from "react";

export interface SummaryCard {
  title: string;
  body: string;
}

export default function CompetitorSummaryCards({
  heading,
  intro,
  cards,
}: {
  heading?: string;
  intro?: string[];
  cards: SummaryCard[];
}) {
  return (
    <section>
      {heading && <h2>{heading}</h2>}
      {intro?.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1rem",
          margin: "1rem 0",
        }}
      >
        {cards.map((card, index) => (
          <article key={index} className="pt_box" style={{ padding: "1.25rem", margin: 0 }}>
            <h3 style={{ fontSize: "1.05rem" }}>{card.title}</h3>
            <p style={{ marginBottom: 0 }}>{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
