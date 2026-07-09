import React from "react";

export default function CompetitorStrengthsSection({
  heading,
  paragraphs,
  points,
}: {
  heading: string;
  paragraphs?: string[];
  points: string[];
}) {
  return (
    <section>
      <h2>{heading}</h2>
      {paragraphs?.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      <ul>
        {points.map((point, index) => (
          <li key={index}>{point}</li>
        ))}
      </ul>
    </section>
  );
}
