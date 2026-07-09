import React from "react";

export default function PlaceholderImage({
  label,
  description,
}: {
  label: string;
  description?: string;
}) {
  return (
    <figure
      style={{
        border: "2px dashed var(--muted-border-color, #ccc)",
        borderRadius: "8px",
        padding: "2.5rem 1.5rem",
        textAlign: "center",
        margin: "1.25rem 0",
        background: "rgba(0,0,0,0.02)",
      }}
    >
      <p style={{ margin: 0, fontWeight: 600 }}>
        <i className="fa-light fa-image"></i> Screenshot placeholder: {label}
      </p>
      {description && (
        <figcaption style={{ fontSize: "0.85rem", opacity: 0.7, marginTop: "0.5rem" }}>
          {description}
        </figcaption>
      )}
    </figure>
  );
}
