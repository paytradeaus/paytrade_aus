import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTokenDetails } from "@/hooks";
import { searchSupport, askAiSupport } from "./aiSupport.functions";
import CustomButton from "@/components/CustomButton/CustomButton";
import { buttonType } from "@/shared/constant/general";
import { showErrorToast, showInfoToast } from "@/components/Toaster";
import { AppRoutes } from "@/shared/constant/appRoutes";
import Link from "next/link";
import DOMPurify from "dompurify";

interface SearchResult {
  id: string;
  type: string;
  title: string;
  snippet: string;
  url: string;
  category: string;
}

export default function AiSupportPage() {
  const router = useRouter();
  const { decodeTokenData }: any = useTokenDetails();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [isAskingAi, setIsAskingAi] = useState(false);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [aiError, setAiError] = useState("");
  const [communityPostId, setCommunityPostId] = useState<string | null>(null);
  const [showAiSection, setShowAiSection] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setSearchQuery(value);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (value.trim().length >= 2) {
      debounceTimer.current = setTimeout(() => {
        performSearch(value.trim());
      }, 400);
    } else {
      setSearchResults([]);
      setTotalCount(0);
      setHasSearched(false);
    }
  }

  async function performSearch(query: string) {
    setIsSearching(true);
    setHasSearched(true);
    try {
      const result = await searchSupport(query);
      setSearchResults(result.results || []);
      setTotalCount(result.totalCount || 0);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      performSearch(searchQuery.trim());
    }
  }

  function getResultIcon(type: string) {
    switch (type) {
      case "faq":
        return "fa-light fa-circle-question";
      case "guide":
        return "fa-light fa-book-open";
      case "discussion":
        return "fa-light fa-comments";
      case "answer":
        return "fa-light fa-message-check";
      default:
        return "fa-light fa-file";
    }
  }

  function getResultLabel(type: string) {
    switch (type) {
      case "faq":
        return "FAQ";
      case "guide":
        return "How-to Guide";
      case "discussion":
        return "Discussion";
      case "answer":
        return "Community Answer";
      default:
        return "Result";
    }
  }

  async function handleAskAi() {
    if (!decodeTokenData) {
      showInfoToast("Please log in to use the AI assistant.");
      router.push(AppRoutes.USER_LOGIN);
      return;
    }

    const question = aiQuestion.trim() || searchQuery.trim();
    if (!question) {
      showErrorToast("Please enter a question.");
      return;
    }

    if (question.length > 500) {
      showErrorToast("Question must be 500 characters or less.");
      return;
    }

    setIsAskingAi(true);
    setAiError("");
    setAiAnswer("");
    setCommunityPostId(null);

    try {
      const result = await askAiSupport(question);

      if (result.status === "SUCCESS") {
        setAiAnswer(result.answer || "");
        setRemainingQuota(result.remainingQuota);
        setCommunityPostId(result.communityPostId);
      } else if (result.status === "OFF_TOPIC") {
        setAiError(
          result.message ||
            "We don't think this is a topic we can help with. Please contact support for further assistance."
        );
      } else if (result.status === "RATE_LIMITED") {
        setAiError(result.message || "Rate limit reached.");
      } else {
        setAiError(result.message || "Something went wrong.");
      }
    } catch (err: any) {
      setAiError("Something went wrong. Please try again.");
    } finally {
      setIsAskingAi(false);
    }
  }

  return (
    <main>
      <div className="pt_centered">
        <div className="pt_centeredinner">
          <div>
            <div className="pt_box_transparent">
              <div className="pt_topfilters">
                <div className="pt_pageactions">
                  <CustomButton
                    actionType="button"
                    buttonName="Close"
                    buttonType={`${buttonType.CONTRAST} ${buttonType.SMALL_BUTTON}`}
                    onClick={() => router.back()}
                    iconClassName={"fa-light fa-xmark-large"}
                  />
                </div>
              </div>
              <div className="grid">
                <div className="pt_login">
                  <h1>Help & AI Search</h1>
                  <h5>
                    Search our FAQs, guides and community discussions to find
                    your answer.
                  </h5>

                  <form onSubmit={handleSearchSubmit}>
                    <div style={{ position: "relative", marginBottom: "1rem" }}>
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search FAQs, guides, community discussions..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        style={{ paddingRight: "3rem" }}
                      />
                      <i
                        className="fa-light fa-magnifying-glass"
                        style={{
                          position: "absolute",
                          right: "1rem",
                          top: "50%",
                          transform: "translateY(-50%)",
                          opacity: 0.5,
                        }}
                      />
                    </div>
                  </form>

                  {isSearching && (
                    <div style={{ textAlign: "center", padding: "1rem" }}>
                      <i className="fa-light fa-spinner-third fa-spin" />{" "}
                      Searching...
                    </div>
                  )}

                  {hasSearched && !isSearching && searchResults.length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "1.5rem",
                        background: "var(--card-background-color)",
                        borderRadius: "8px",
                        marginBottom: "1rem",
                      }}
                    >
                      <i
                        className="fa-light fa-face-thinking"
                        style={{ fontSize: "2rem", marginBottom: "0.5rem" }}
                      />
                      <p>No results found for &quot;{searchQuery}&quot;</p>
                      <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>
                        Try a different search or ask PayTrade AI below.
                      </p>
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div style={{ marginBottom: "1.5rem" }}>
                      <h6 style={{ marginBottom: "0.75rem" }}>
                        {totalCount} result{totalCount !== 1 ? "s" : ""} found
                      </h6>
                      {["faq", "guide", "discussion", "answer"]
                        .filter((type) =>
                          searchResults.some((r) => r.type === type)
                        )
                        .map((type) => (
                          <div key={type} style={{ marginBottom: "1rem" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                marginBottom: "0.5rem",
                                paddingBottom: "0.25rem",
                                borderBottom:
                                  "1px solid var(--muted-border-color)",
                              }}
                            >
                              <i className={getResultIcon(type)} />
                              <span
                                style={{
                                  fontWeight: 600,
                                  fontSize: "0.85rem",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                {getResultLabel(type)}s
                              </span>
                            </div>
                            {searchResults
                              .filter((r) => r.type === type)
                              .map((result) => (
                                <Link
                                  key={`${result.type}-${result.id}`}
                                  href={result.url || "#"}
                                  style={{
                                    textDecoration: "none",
                                    color: "inherit",
                                  }}
                                >
                                  <div
                                    style={{
                                      padding: "0.75rem 1rem",
                                      background:
                                        "var(--card-background-color)",
                                      borderRadius: "8px",
                                      marginBottom: "0.5rem",
                                      cursor: "pointer",
                                      transition: "background 0.2s",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        marginBottom: "0.25rem",
                                      }}
                                    >
                                      {result.category && (
                                        <span
                                          style={{
                                            fontSize: "0.7rem",
                                            opacity: 0.5,
                                          }}
                                        >
                                          {result.category}
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ fontWeight: 600 }}>
                                      {result.title}
                                    </div>
                                    {result.snippet && (
                                      <div
                                        style={{
                                          fontSize: "0.85rem",
                                          opacity: 0.7,
                                          marginTop: "0.25rem",
                                        }}
                                      >
                                        {result.snippet}
                                      </div>
                                    )}
                                  </div>
                                </Link>
                              ))}
                          </div>
                        ))}
                    </div>
                  )}

                  {hasSearched && !isSearching && (
                    <div
                      style={{
                        borderTop: "1px solid var(--muted-border-color)",
                        paddingTop: "1.5rem",
                        marginTop: "1rem",
                      }}
                    >
                    {!showAiSection ? (
                      <div style={{ textAlign: "center" }}>
                        <i
                          className="fa-light fa-robot"
                          style={{
                            fontSize: "2rem",
                            opacity: 0.5,
                            display: "block",
                            marginBottom: "0.5rem",
                          }}
                        />
                        <h5>Didn&apos;t find what you needed?</h5>
                        <p
                          style={{
                            fontSize: "0.9rem",
                            opacity: 0.7,
                            marginBottom: "1rem",
                          }}
                        >
                          Ask our AI assistant for a detailed answer to your
                          question.
                        </p>
                        <CustomButton
                          actionType="button"
                          buttonName="Ask PayTrade AI"
                          buttonType={buttonType.SECONDARY}
                          onClick={() => {
                            setShowAiSection(true);
                            setAiQuestion(searchQuery);
                          }}
                          iconClassName="fa-light fa-robot"
                        />
                      </div>
                    ) : (
                      <div>
                        <h5>
                          <i className="fa-light fa-robot" /> Ask PayTrade AI
                        </h5>
                        {!decodeTokenData && (
                          <div
                            style={{
                              padding: "0.75rem",
                              background: "var(--del-color)",
                              borderRadius: "8px",
                              marginBottom: "1rem",
                              fontSize: "0.9rem",
                            }}
                          >
                            <i className="fa-light fa-lock" /> Please{" "}
                            <Link
                              href={AppRoutes.USER_LOGIN}
                              style={{ fontWeight: 600 }}
                            >
                              log in
                            </Link>{" "}
                            to use the AI assistant.
                          </div>
                        )}
                        <textarea
                          placeholder="Type your question here (max 500 characters)..."
                          value={aiQuestion}
                          onChange={(e) => setAiQuestion(e.target.value)}
                          maxLength={500}
                          rows={3}
                          style={{ marginBottom: "0.5rem" }}
                        />
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "1rem",
                          }}
                        >
                          <span style={{ fontSize: "0.8rem", opacity: 0.5 }}>
                            {aiQuestion.length}/500
                          </span>
                          {remainingQuota !== null && (
                            <span style={{ fontSize: "0.8rem", opacity: 0.6 }}>
                              {remainingQuota} question
                              {remainingQuota !== 1 ? "s" : ""} remaining
                            </span>
                          )}
                        </div>
                        <CustomButton
                          actionType="button"
                          buttonName={
                            isAskingAi ? "Thinking..." : "Get AI Answer"
                          }
                          buttonType={buttonType.SECONDARY}
                          onClick={handleAskAi}
                          disabled={isAskingAi || !aiQuestion.trim()}
                          iconClassName={
                            isAskingAi
                              ? "fa-light fa-spinner-third fa-spin"
                              : "fa-light fa-sparkles"
                          }
                        />

                        {aiError && (
                          <div
                            style={{
                              padding: "1rem",
                              background: "var(--del-color)",
                              borderRadius: "8px",
                              marginTop: "1rem",
                            }}
                          >
                            <i className="fa-light fa-triangle-exclamation" />{" "}
                            {aiError}
                          </div>
                        )}

                        {aiAnswer && (
                          <div
                            style={{
                              padding: "1.25rem",
                              background: "var(--card-background-color)",
                              borderRadius: "8px",
                              marginTop: "1rem",
                              borderLeft:
                                "4px solid var(--primary-focus)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                marginBottom: "0.75rem",
                                fontWeight: 600,
                              }}
                            >
                              <i className="fa-light fa-robot" /> PayTrade AI
                            </div>
                            <div
                              dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(
                                  aiAnswer.replace(/\n/g, "<br />")
                                ),
                              }}
                            />
                            <div
                              style={{
                                fontSize: "0.8rem",
                                opacity: 0.5,
                                marginTop: "1rem",
                                fontStyle: "italic",
                              }}
                            >
                              AI-generated response. Please verify important
                              details with PayTrade support.
                            </div>
                            {communityPostId && (
                              <div
                                style={{
                                  fontSize: "0.85rem",
                                  marginTop: "0.5rem",
                                  opacity: 0.7,
                                }}
                              >
                                <i className="fa-light fa-comments" /> This Q&A
                                has been shared in the{" "}
                                <Link href={AppRoutes.COMMUNITY}>
                                  community
                                </Link>
                                .
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                  )}

                  <div
                    style={{
                      borderTop: "1px solid var(--muted-border-color)",
                      paddingTop: "1.5rem",
                      marginTop: "1.5rem",
                      textAlign: "center",
                    }}
                  >
                    <h5>Still need help?</h5>
                    <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>
                      Our support team is here to assist you.
                    </p>
                    <CustomButton
                      actionType="button"
                      buttonName="Contact Support"
                      buttonType={buttonType.CONTRAST}
                      onClick={() => router.push("/get-support")}
                      iconClassName="fa-light fa-envelope"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
