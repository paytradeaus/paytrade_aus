import React from "react";

export interface SourceNote {
  label: string;
  url?: string;
}

export default function SourceNoteBox({
  sources,
  heading = "Sources & notes",
}: {
  sources: SourceNote[];
  heading?: string;
}) {
  if (!sources?.length) return null;
  return (
    <aside
      className="pt_box"
      style={{ padding: "1rem 1.25rem", margin: "1.5rem 0", fontSize: "0.85rem" }}
    >
      <h6 style={{ marginBottom: "0.5rem" }}>{heading}</h6>
      <ul style={{ margin: 0 }}>
        {sources.map((source, index) => (
          <li key={index}>
            {source.url ? (
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                {source.label}
              </a>
            ) : (
              source.label
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
