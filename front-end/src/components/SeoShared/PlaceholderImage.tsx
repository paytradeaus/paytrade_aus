import React from "react";

export default function PlaceholderImage({
  label,
  description,
  src,
}: {
  label: string;
  description?: string;
  src?: string;
}) {
  if (src) {
    return (
      <figure
        style={{
          margin: "1.25rem 0",
          border: "1px solid var(--muted-border-color, #e0e0e0)",
          borderRadius: "8px",
          overflow: "hidden",
          background: "#fff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={description ? `${label} — ${description}` : label}
          loading="lazy"
          style={{ display: "block", width: "100%", height: "auto" }}
        />
        <figcaption
          style={{
            fontSize: "0.85rem",
            opacity: 0.75,
            padding: "0.6rem 1rem",
            borderTop: "1px solid var(--muted-border-color, #eee)",
          }}
        >
          <strong>{label}.</strong> {description}
        </figcaption>
      </figure>
    );
  }

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
