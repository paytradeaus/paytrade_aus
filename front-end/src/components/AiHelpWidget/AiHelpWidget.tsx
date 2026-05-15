"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTokenDetails } from "@/hooks";
import { searchSupport } from "@/modules/general/AiSupport/aiSupport.functions";
import {
  streamAiChatMessage,
  AiChatPageContext,
  StreamAiChatCallbacks,
} from "@/network/uiPreferences";
import CustomButton from "@/components/CustomButton/CustomButton";
import { buttonType } from "@/shared/constant/general";
import { showErrorToast, showInfoToast } from "@/components/Toaster";
import { AppRoutes } from "@/shared/constant/appRoutes";
import Link from "next/link";
import DOMPurify from "dompurify";
import styles from "./AiHelpWidget.module.scss";

interface SearchResult {
  id: string;
  type: string;
  title: string;
  snippet: string;
  url: string;
  category: string;
}

interface AiHelpWidgetProps {
  context?: string;
}

export default function AiHelpWidget({ context }: AiHelpWidgetProps) {
  const router = useRouter();
  const { decodeTokenData }: any = useTokenDetails();
  const [isOpen, setIsOpen] = useState(false);

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
  const [showAiSection, setShowAiSection] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      try {
        abortRef.current?.abort();
      } catch {
        /* noop */
      }
    };
  }, []);

  const performSearch = useCallback(async (query: string) => {
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

    const pageContext: AiChatPageContext | undefined = context
      ? { route: typeof window !== "undefined" ? window.location.pathname : "", pageLabel: context }
      : undefined;

    const controller = new AbortController();
    abortRef.current = controller;

    const callbacks: StreamAiChatCallbacks & { pageContext?: AiChatPageContext } = {
      pageContext,
      signal: controller.signal,
      onDelta: (chunk) => {
        setAiAnswer((prev) => prev + chunk);
      },
      onDone: (res) => {
        if (typeof res.remainingQuota === "number") {
          setRemainingQuota(res.remainingQuota);
        }
        if (res.status && res.status !== "SUCCESS" && res.message) {
          setAiError(res.message);
        }
        setIsAskingAi(false);
        abortRef.current = null;
      },
      onError: (msg) => {
        setAiError(msg || "Something went wrong. Please try again.");
        setIsAskingAi(false);
        abortRef.current = null;
      },
      onAborted: () => {
        // The backend persists whatever was streamed so far. Keep the
        // partial answer visible and let the user ask again immediately.
        setIsAskingAi(false);
        abortRef.current = null;
      },
    };

    await streamAiChatMessage(question, callbacks);
  }

  function handleStopAi() {
    if (!isAskingAi) return;
    try {
      abortRef.current?.abort();
    } catch {
      /* noop */
    }
  }

  function handleClose() {
    try {
      abortRef.current?.abort();
    } catch {
      /* noop */
    }
    setIsOpen(false);
  }

  function resetState() {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    try {
      abortRef.current?.abort();
    } catch {
      /* noop */
    }
    abortRef.current = null;
    setSearchQuery("");
    setSearchResults([]);
    setTotalCount(0);
    setIsSearching(false);
    setHasSearched(false);
    setAiQuestion("");
    setAiAnswer("");
    setIsAskingAi(false);
    setAiError("");
    setShowAiSection(false);
  }

  function handleOpen() {
    resetState();
    setIsOpen(true);
  }

  return (
    <div className={styles.widgetContainer}>
      {!isOpen && (
        <button
          className={styles.floatingButton}
          onClick={handleOpen}
          title="Need Help?"
          aria-label="Open help panel"
        >
          <i className="fa-light fa-circle-question" />
        </button>
      )}

      {isOpen && (
        <>
          <div className={styles.overlay} onClick={handleClose} />
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3>
                <i className="fa-light fa-circle-question" />
                Need Help?
              </h3>
              <button
                aria-label="Close"
                rel="prev"
                onClick={handleClose}
              />
            </div>

            <div className={styles.panelBody}>
              {context && (
                <div className={styles.contextBadge}>
                  <i className="fa-light fa-link" />
                  {context}
                </div>
              )}

              <form onSubmit={handleSearchSubmit}>
                <div className={styles.searchWrapper}>
                  <input
                    ref={searchInputRef}
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search FAQs, guides, discussions..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                  />
                  <i
                    className={`fa-light fa-magnifying-glass ${styles.searchIcon}`}
                  />
                </div>
              </form>

              {isSearching && (
                <div className={styles.loadingIndicator}>
                  <i className="fa-light fa-spinner-third fa-spin" />{" "}
                  Searching...
                </div>
              )}

              {hasSearched && !isSearching && searchResults.length === 0 && (
                <div className={styles.noResults}>
                  <i
                    className={`fa-light fa-face-thinking ${styles.noResultsIcon}`}
                  />
                  <p>No results found for &quot;{searchQuery}&quot;</p>
                  <p className={styles.noResultsHint}>
                    Try a different search or ask PayTrade AI below.
                  </p>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className={styles.resultsSection}>
                  <div className={styles.resultsCount}>
                    {totalCount} result{totalCount !== 1 ? "s" : ""} found
                  </div>
                  {["faq", "guide", "discussion", "answer"]
                    .filter((type) =>
                      searchResults.some((r) => r.type === type)
                    )
                    .map((type) => (
                      <div key={type} className={styles.resultGroup}>
                        <div className={styles.resultGroupHeader}>
                          <i className={getResultIcon(type)} />
                          <span>{getResultLabel(type)}s</span>
                        </div>
                        {searchResults
                          .filter((r) => r.type === type)
                          .map((result) => (
                            <Link
                              key={`${result.type}-${result.id}`}
                              href={result.url || "#"}
                              className={styles.resultCard}
                              onClick={handleClose}
                            >
                              {result.category && (
                                <div className={styles.resultCategory}>
                                  {result.category}
                                </div>
                              )}
                              <div className={styles.resultTitle}>
                                {result.title}
                              </div>
                              {result.snippet && (
                                <div className={styles.resultSnippet}>
                                  {result.snippet}
                                </div>
                              )}
                            </Link>
                          ))}
                      </div>
                    ))}
                </div>
              )}

              {hasSearched && !isSearching && (
                <div className={styles.divider}>
                  {!showAiSection ? (
                    <div className={styles.aiPrompt}>
                      <i
                        className={`fa-light fa-robot ${styles.aiPromptIcon}`}
                      />
                      <h5>Didn&apos;t find what you needed?</h5>
                      <p>
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
                    <div className={styles.aiSection}>
                      <h5>
                        <i className="fa-light fa-robot" /> Ask PayTrade AI
                      </h5>
                      {!decodeTokenData && (
                        <div className={styles.loginWarning}>
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
                        className={styles.aiTextarea}
                        placeholder="Type your question here (max 500 characters)..."
                        value={aiQuestion}
                        onChange={(e) => setAiQuestion(e.target.value)}
                        maxLength={500}
                        rows={3}
                        disabled={isAskingAi}
                      />
                      <div className={styles.aiMeta}>
                        <span>{aiQuestion.length}/500</span>
                        {remainingQuota !== null && (
                          <span>
                            {remainingQuota} question
                            {remainingQuota !== 1 ? "s" : ""} remaining
                          </span>
                        )}
                      </div>
                      {isAskingAi ? (
                        <CustomButton
                          actionType="button"
                          buttonName="Stop"
                          buttonType={buttonType.SECONDARY}
                          onClick={handleStopAi}
                          iconClassName="fa-light fa-stop"
                        />
                      ) : (
                        <CustomButton
                          actionType="button"
                          buttonName="Get AI Answer"
                          buttonType={buttonType.SECONDARY}
                          onClick={handleAskAi}
                          disabled={!aiQuestion.trim()}
                          iconClassName="fa-light fa-sparkles"
                        />
                      )}

                      {aiError && (
                        <div className={styles.aiError}>
                          <i className="fa-light fa-triangle-exclamation" />{" "}
                          {aiError}
                        </div>
                      )}

                      {aiAnswer && (
                        <div className={styles.aiAnswer}>
                          <div className={styles.aiAnswerHeader}>
                            <i className="fa-light fa-robot" /> PayTrade AI
                            {isAskingAi && (
                              <span
                                style={{
                                  marginLeft: "0.5rem",
                                  fontSize: "0.8rem",
                                  opacity: 0.7,
                                }}
                              >
                                <i className="fa-light fa-spinner-third fa-spin" />{" "}
                                streaming…
                              </span>
                            )}
                          </div>
                          <div
                            className={styles.aiAnswerBody}
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(
                                aiAnswer.replace(/\n/g, "<br />")
                              ),
                            }}
                          />
                          <div className={styles.aiDisclaimer}>
                            AI-generated response. Please verify important
                            details with PayTrade support.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className={styles.contactSection}>
                <h5>Still need help?</h5>
                <p>Our support team is here to assist you.</p>
                <CustomButton
                  actionType="button"
                  buttonName="Contact Support"
                  buttonType={buttonType.CONTRAST}
                  onClick={() => {
                    handleClose();
                    router.push("/get-support");
                  }}
                  iconClassName="fa-light fa-envelope"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
