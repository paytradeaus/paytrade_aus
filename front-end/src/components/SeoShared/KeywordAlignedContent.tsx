import React from "react";
import Link from "next/link";
import { getRelatedContentForKeyword } from "@/modules/general/SeoKeywords/seo-keywords.functions";

interface RelatedContentItem {
  type: string;
  title: string;
  excerpt: string;
  url: string;
  category: string | null;
  meta: string | null;
}

function ContentCard({ item }: { item: RelatedContentItem }) {
  return (
    <Link
      href={item.url}
      style={{
        display: "block",
        border: "1px solid var(--muted-border-color, #e0e0e0)",
        borderRadius: "8px",
        padding: "1rem 1.25rem",
        textDecoration: "none",
        color: "inherit",
        background: "#fff",
      }}
    >
      <span style={{ fontSize: "0.75rem", opacity: 0.65, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {item.type === "community" ? "Community" : item.meta || "Guide"}
        {item.category ? ` · ${item.category}` : ""}
      </span>
      <h3 style={{ fontSize: "1rem", margin: "0.35rem 0" }}>{item.title}</h3>
      {item.excerpt && (
        <p style={{ fontSize: "0.85rem", opacity: 0.75, margin: 0 }}>
          {item.excerpt.length > 160
            ? `${item.excerpt.slice(0, 160).replace(/\s+\S*$/, "")}…`
            : item.excerpt}
        </p>
      )}
    </Link>
  );
}

export default async function KeywordAlignedContent({
  keyword,
}: {
  keyword: string;
}) {
  const { community, guides } = await getRelatedContentForKeyword(keyword);
  if (!guides.length && !community.length) return null;

  return (
    <section>
      {guides.length > 0 && (
        <>
          <h2>Guides on {keyword.toLowerCase()}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem", margin: "1rem 0" }}>
            {guides.map((item: RelatedContentItem, i: number) => (
              <ContentCard key={`g${i}`} item={item} />
            ))}
          </div>
        </>
      )}
      {community.length > 0 && (
        <>
          <h2>From the PayTrade community</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem", margin: "1rem 0" }}>
            {community.map((item: RelatedContentItem, i: number) => (
              <ContentCard key={`c${i}`} item={item} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
