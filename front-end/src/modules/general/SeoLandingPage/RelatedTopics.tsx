"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getActiveSeoKeywords } from "../SeoKeywords/seo-keywords.functions";
import styles from "./RelatedTopics.module.css";

interface SeoKeyword {
  id: string;
  keyword: string;
  slug: string;
  page_title: string;
  tags: string[] | null;
}

function getRelevanceScore(
  current: SeoKeyword,
  candidate: SeoKeyword
): number {
  let score = 0;
  if (current.tags && current.tags.length > 0 && candidate.tags && candidate.tags.length > 0) {
    const currentTags = new Set(current.tags.map((t) => t.toLowerCase()));
    for (const tag of candidate.tags) {
      if (currentTags.has(tag.toLowerCase())) {
        score += 2;
      }
    }
  }
  const currentWords = new Set(
    current.keyword
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );
  const candidateWords = candidate.keyword.toLowerCase().split(/\s+/);
  for (const word of candidateWords) {
    if (currentWords.has(word)) {
      score += 1;
    }
  }
  return score;
}

function computeRelated(
  others: SeoKeyword[],
  currentSlug: string,
  currentKeyword: string,
  currentTags: string[] | null
): SeoKeyword[] {
  const currentItem: SeoKeyword = {
    id: "",
    keyword: currentKeyword,
    slug: currentSlug,
    page_title: "",
    tags: currentTags,
  };

  const scored = others
    .map((kw) => ({ kw, score: getRelevanceScore(currentItem, kw) }))
    .sort(
      (a, b) =>
        b.score - a.score || a.kw.page_title.localeCompare(b.kw.page_title)
    );

  return scored.slice(0, 12).map((s) => s.kw);
}

export default function RelatedTopics({
  currentSlug,
  currentKeyword,
  currentTags,
  initialKeywords = [],
}: {
  currentSlug: string;
  currentKeyword: string;
  currentTags: string[] | null;
  initialKeywords?: SeoKeyword[];
}) {
  const initialOthers = initialKeywords.filter(
    (kw) => kw.slug !== currentSlug
  );
  const [relatedKeywords, setRelatedKeywords] = useState<SeoKeyword[]>(
    computeRelated(initialOthers, currentSlug, currentKeyword, currentTags)
  );
  const [allKeywords, setAllKeywords] = useState<SeoKeyword[]>(initialOthers);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (initialKeywords.length > 0) return;
    getActiveSeoKeywords().then((result) => {
      if (result?.seoKeywords) {
        const others = result.seoKeywords.filter(
          (kw: SeoKeyword) => kw.slug !== currentSlug
        );
        setAllKeywords(others);
        setRelatedKeywords(
          computeRelated(others, currentSlug, currentKeyword, currentTags)
        );
      }
    });
  }, [currentSlug, currentKeyword, currentTags, initialKeywords.length]);

  if (allKeywords.length === 0) return null;

  const displayKeywords = showAll ? allKeywords : relatedKeywords;

  return (
    <div className={styles.relatedSection}>
      <h2 className={styles.sectionTitle}>
        {showAll ? "All Topics" : "Related Topics"}
      </h2>
      <p className={styles.sectionSubtitle}>
        {showAll
          ? "Browse all project trust and QBCC compliance topics"
          : "Explore more about project trust accounts and QBCC compliance"}
      </p>
      <div className={styles.topicsGrid}>
        {displayKeywords.map((kw) => (
          <Link
            key={kw.slug}
            href={`/topics/${kw.slug}`}
            className={styles.topicCard}
          >
            <span className={styles.topicTitle}>{kw.page_title}</span>
            {kw.tags && kw.tags.length > 0 && (
              <div className={styles.topicTags}>
                {kw.tags.slice(0, 3).map((tag, i) => (
                  <span key={i} className={styles.topicTag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
      {!showAll && allKeywords.length > 12 && (
        <button
          className={styles.showAllButton}
          onClick={() => setShowAll(true)}
        >
          View All {allKeywords.length} Topics
        </button>
      )}
      {showAll && (
        <button
          className={styles.showAllButton}
          onClick={() => setShowAll(false)}
        >
          Show Related Only
        </button>
      )}
    </div>
  );
}
