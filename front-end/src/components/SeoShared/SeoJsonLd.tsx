import React from "react";

export default function SeoJsonLd({
  data,
}: {
  data: Record<string, any> | Record<string, any>[];
}) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
