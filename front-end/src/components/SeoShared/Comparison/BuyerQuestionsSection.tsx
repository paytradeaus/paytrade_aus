import React from "react";

export default function BuyerQuestionsSection({
  heading = "Questions to ask on a demo",
  intro,
  questions,
}: {
  heading?: string;
  intro?: string[];
  questions: string[];
}) {
  return (
    <section>
      <h2>{heading}</h2>
      {intro?.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      <ol>
        {questions.map((question, index) => (
          <li key={index}>{question}</li>
        ))}
      </ol>
    </section>
  );
}
