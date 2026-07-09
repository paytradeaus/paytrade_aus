import React from "react";

export interface FitDecision {
  scenario: string;
  recommendation: string;
}

export default function FitDecisionSection({
  heading = "Which is the right fit?",
  intro,
  decisions,
}: {
  heading?: string;
  intro?: string[];
  decisions: FitDecision[];
}) {
  return (
    <section>
      <h2>{heading}</h2>
      {intro?.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      <ul>
        {decisions.map((decision, index) => (
          <li key={index}>
            <strong>{decision.scenario}</strong> — {decision.recommendation}
          </li>
        ))}
      </ul>
    </section>
  );
}
