"use client";
import { useEffect, useState, useMemo } from "react";
import { getSeoKeywordBySlug } from "../SeoKeywords/seo-keywords.functions";
import { useParams } from "next/navigation";
import DOMPurify from "dompurify";
import styles from "./SeoLandingPage.module.css";

interface SeoKeywordData {
  id: string;
  keyword: string;
  slug: string;
  page_title: string;
  meta_description: string;
  page_content: string | null;
  tags: string[] | null;
}

export default function SeoLandingPage({
  initialData,
}: {
  initialData?: SeoKeywordData | null;
}) {
  const params = useParams();
  const [keywordData, setKeywordData] = useState<SeoKeywordData | null>(
    initialData || null
  );
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (!initialData && params?.slug) {
      const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
      setLoading(true);
      getSeoKeywordBySlug(slug)
        .then((data) => {
          setKeywordData(data);
        })
        .finally(() => setLoading(false));
    }
  }, [params?.slug, initialData]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}></div>
      </div>
    );
  }

  if (!keywordData) {
    return (
      <div className={styles.notFound}>
        <h1>Page Not Found</h1>
        <p>The page you are looking for does not exist.</p>
      </div>
    );
  }

  return (
    <div className={styles.landingPage}>
      <div className={styles.heroSection}>
        <h1 className={styles.title}>{keywordData.page_title}</h1>
        <p className={styles.description}>{keywordData.meta_description}</p>
        {keywordData.tags && keywordData.tags.length > 0 && (
          <div className={styles.tags}>
            {keywordData.tags.map((tag, index) => (
              <span key={index} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {keywordData.page_content && (
        <div className={styles.contentSection}>
          <div
            className={styles.content}
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(keywordData.page_content, {
                ALLOWED_TAGS: [
                  "p", "h1", "h2", "h3", "h4", "h5", "h6",
                  "ul", "ol", "li", "a", "strong", "em", "b", "i",
                  "br", "hr", "blockquote", "img", "table", "thead",
                  "tbody", "tr", "th", "td", "span", "div", "pre", "code",
                ],
                ALLOWED_ATTR: ["href", "src", "alt", "class", "target", "rel"],
              }),
            }}
          />
        </div>
      )}

      <div className={styles.ctaSection}>
        <h2>Ready to get started?</h2>
        <p>
          Sign up for PayTrade today and simplify your construction trust
          accounting.
        </p>
        <a href="/user/signup" className={styles.ctaButton}>
          Get Started Free
        </a>
      </div>
    </div>
  );
}
