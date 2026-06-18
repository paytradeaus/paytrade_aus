"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSeoKeywordPageData } from "../SeoKeywords/seo-keywords.functions";
import { useParams } from "next/navigation";
import { AppRoutes } from "@/shared/constant/appRoutes";

import DOMPurify from "isomorphic-dompurify";

const sanitizeHtml = (html: string, options?: any): string => {
  return DOMPurify.sanitize(html, options) as unknown as string;
};
import styles from "./SeoLandingPage.module.css";
import RelatedTopics from "./RelatedTopics";
import BusinessHighlights from "@/components/HomeScreen/sections/BusinessHighlights";
import OnboardingSupport from "@/components/HomeScreen/sections/OnboardingSupport";
import UserGuidesLinks from "@/components/HomeScreen/sections/UserGuidesLinks";
import FinalCta from "@/components/HomeScreen/sections/FinalCta";
import FeaturesSection from "@/components/HomeScreen/sections/FeaturesSection";

interface SeoKeywordData {
  id: string;
  keyword: string;
  slug: string;
  page_title: string;
  meta_description: string;
  page_content: string | null;
  hero_image_url: string | null;
  tags: string[] | null;
}

interface RelatedContentItem {
  type: string;
  title: string;
  excerpt: string;
  url: string;
  category: string | null;
  meta: string | null;
}

interface RelatedKeyword {
  id: string;
  keyword: string;
  slug: string;
  page_title: string;
  tags: string[] | null;
}

function CtaCard({ keyword }: { keyword: string }) {
  return (
    <div className={styles.ctaSection}>
      <h2>Ready to simplify {keyword.toLowerCase()}?</h2>
      <p>
        Join builders and subcontractors using PayTrade to manage construction
        trust accounting, claims and compliance with confidence.
      </p>
      <Link href={AppRoutes.USER_LOGIN} className="cta">
        <button>
          Get Started Free
          <i className="fa-light fa-arrow-right right"></i>
        </button>
      </Link>
    </div>
  );
}

function ContentCards({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: RelatedContentItem[];
}) {
  if (!items || items.length === 0) return null;
  return (
    <section className={styles.relatedContent}>
      <h2 className={styles.sectionHeading}>{title}</h2>
      <p className={styles.sectionSub}>{subtitle}</p>
      <div className={styles.contentCards}>
        {items.map((item, i) => (
          <Link key={i} href={item.url} className={styles.contentCard}>
            {item.category && (
              <span className={styles.cardCategory}>{item.category}</span>
            )}
            <h3 className={styles.cardTitle}>{item.title}</h3>
            {item.excerpt && <p className={styles.cardExcerpt}>{item.excerpt}</p>}
            {item.meta && <span className={styles.cardMeta}>{item.meta}</span>}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function SeoLandingPage({
  initialData,
  community = [],
  guides = [],
  allKeywords = [],
}: {
  initialData?: SeoKeywordData | null;
  community?: RelatedContentItem[];
  guides?: RelatedContentItem[];
  allKeywords?: RelatedKeyword[];
}) {
  const params = useParams();
  const [keywordData, setKeywordData] = useState<SeoKeywordData | null>(
    initialData || null
  );
  const [communityItems, setCommunityItems] =
    useState<RelatedContentItem[]>(community);
  const [guideItems, setGuideItems] = useState<RelatedContentItem[]>(guides);
  const [keywordList, setKeywordList] =
    useState<RelatedKeyword[]>(allKeywords);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (!initialData && params?.slug) {
      const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
      setLoading(true);
      getSeoKeywordPageData(slug)
        .then((data) => {
          if (data) {
            setKeywordData(data.data);
            setCommunityItems(data.community || []);
            setGuideItems(data.guides || []);
          }
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
    <main>
      <div className="pt_hometop">
        <div className="container-fluid">
          <div className="grid">
            <div className="pt_hometoptext">
              <div className="pt_hometoptextinner">
                <h1 className="oceantext">{keywordData.page_title}</h1>
                <p>{keywordData.meta_description}</p>
                {keywordData.tags && keywordData.tags.length > 0 && (
                  <div className={styles.tags}>
                    {keywordData.tags.map((tag, index) => (
                      <span key={index} className={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <Link href={AppRoutes.USER_LOGIN} className="cta">
                  <button>
                    Get Started Free
                    <i className="fa-light fa-arrow-right right"></i>
                  </button>
                </Link>
              </div>
              <div className="blurblobtheme"></div>
            </div>
            <div className="pt_hometopimage">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={keywordData.page_title}
                src={
                  keywordData.hero_image_url || "/images/mockupshots.png?v=3"
                }
                className="mockupshots"
                loading="eager"
                decoding="async"
              />
              <div className="blurblobriver"></div>
              <div className="blurblobcoral"></div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.landingPage}>
        {keywordData.page_content && (
          <div className={styles.contentSection}>
            <div
              className={styles.content}
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(keywordData.page_content, {
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

        <ContentCards
          title={`Community discussions about ${keywordData.keyword}`}
          subtitle="Real questions and answers from the PayTrade construction community."
          items={communityItems}
        />

        <ContentCards
          title={`Guides & articles on ${keywordData.keyword}`}
          subtitle="Step-by-step how-to guides and articles to help you stay compliant."
          items={guideItems}
        />

        <CtaCard keyword={keywordData.keyword} />

        <RelatedTopics
          currentSlug={keywordData.slug}
          currentKeyword={keywordData.keyword}
          currentTags={keywordData.tags}
          initialKeywords={keywordList}
        />
      </div>

      <FeaturesSection />

      <BusinessHighlights />
      <OnboardingSupport />
      <UserGuidesLinks />
      <FinalCta />
    </main>
  );
}
