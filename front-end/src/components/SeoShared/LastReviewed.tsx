import React from "react";

export default function LastReviewed({
  date,
  reviewer,
}: {
  date: string;
  reviewer?: string;
}) {
  return (
    <p style={{ fontSize: "0.85rem", opacity: 0.75, margin: "0.5rem 0" }}>
      Last reviewed: <time dateTime={date}>{formatDisplayDate(date)}</time>
      {reviewer ? ` by ${reviewer}` : null}
    </p>
  );
}

function formatDisplayDate(date: string): string {
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
