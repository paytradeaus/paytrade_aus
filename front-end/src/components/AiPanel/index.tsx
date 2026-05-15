"use client";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { getCookie } from "cookies-next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import {
  AI_PANEL_MAX_WIDTH,
  AI_PANEL_MIN_WIDTH,
  setAiPanelState,
  setAiPanelWidth,
} from "@/redux/slices/uiPreferences";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import {
  AiChatMessage,
  AiChatPageContext,
  AiChatThreadSummary,
  clearAiChatHistory,
  createAiChatThread,
  deleteAiChatThread,
  fetchAiChatHistory,
  getAiChatThread,
  listAiChatThreads,
  persistUiPreferences,
  renameAiChatThread,
  sendAiChatMessage,
  streamAiChatMessage,
} from "@/network/uiPreferences";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { applicationStorage } from "@/shared/constant/general";
import styles from "./aiPanel.module.css";

const NUMERIC_RE = /^\d+$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ID_KEY_BY_PARENT: Record<string, string> = {
  projects: "projectId",
  contracts: "contractId",
  claims: "claimId",
  variations: "variationId",
  notices: "noticeId",
  "bank-accounts": "bankAccountId",
  "clients-suppliers": "contactId",
  payments: "paymentId",
  "trust-accounting": "trustRecordId",
  invoices: "invoiceId",
  bills: "billId",
};

const ENTITY_BY_PARENT: Record<string, string> = {
  projects: "project",
  contracts: "contract",
  claims: "claim",
  variations: "variation",
  notices: "notice",
  "bank-accounts": "bankAccount",
  "clients-suppliers": "contact",
  payments: "payment",
  "trust-accounting": "trustRecord",
  invoices: "invoice",
  bills: "bill",
};

function derivePageContext(
  pathname: string | null,
  searchParams: URLSearchParams | null,
): {
  pageLabel: string;
  entityIds: Record<string, string>;
  entity?: string;
  entityId?: string;
} {
  if (!pathname) return { pageLabel: "/", entityIds: {} };
  const segments = pathname.split("/").filter(Boolean);
  const entityIds: Record<string, string> = {};
  const labelParts: string[] = [];
  let entity: string | undefined;
  let entityId: string | undefined;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const isId = NUMERIC_RE.test(seg) || UUID_RE.test(seg);
    if (isId) {
      const parent = segments[i - 1];
      const key = (parent && ID_KEY_BY_PARENT[parent]) || `${parent || "id"}Id`;
      if (!entityIds[key]) entityIds[key] = seg;
      const mappedEntity = parent ? ENTITY_BY_PARENT[parent] : undefined;
      if (mappedEntity && !entity) {
        entity = mappedEntity;
        entityId = seg;
      }
      labelParts.push(seg);
    } else {
      labelParts.push(seg);
    }
  }

  // Fall back to last meaningful segment as entity name when no id present.
  if (!entity) {
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];
      if (!NUMERIC_RE.test(seg) && !UUID_RE.test(seg)) {
        if (ENTITY_BY_PARENT[seg]) entity = ENTITY_BY_PARENT[seg];
        break;
      }
    }
  }

  void searchParams; // currently unused for label, route already includes querystring
  return {
    pageLabel: labelParts.join(" / ") || "/",
    entityIds,
    entity,
    entityId,
  };
}

// Allow target/rel on links so we can open them in a new tab safely.
const markdownSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...((defaultSchema.attributes && defaultSchema.attributes.a) || []),
      ["target"],
      ["rel"],
    ],
  },
};

const MarkdownMessage = memo(function MarkdownMessage({
  text,
}: {
  text: string;
}) {
  return (
    <div className={styles.markdown}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, markdownSanitizeSchema]]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
});

const SUGGESTIONS: { label: string; prompt: string }[] = [
  {
    label: "Fix critical issues",
    prompt: "What critical issues should I fix first in PayTrade today?",
  },
  {
    label: "Review payments",
    prompt: "Help me review payments that need attention.",
  },
  {
    label: "Reconcile trusts",
    prompt: "How do I reconcile my trust account in PayTrade?",
  },
  {
    label: "Draft notices",
    prompt: "Help me draft a payment schedule notice.",
  },
];

function formatThreadDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AiPanel() {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s: RootState) => s.uiPreferences.aiPanelState);
  const width = useAppSelector((s: RootState) => s.uiPreferences.aiPanelWidth);
  const liveFollowEnabled = useAppSelector(
    (s: RootState) => s.uiPreferences.aiLiveFollowEnabled
  );
  const liveFollowPageLabel = useAppSelector(
    (s: RootState) => s.uiPreferences.aiLiveFollowPageLabel
  );
  const showFollowingBadge =
    liveFollowEnabled && !!liveFollowPageLabel && liveFollowPageLabel.length > 0;

  const [threads, setThreads] = useState<AiChatThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeThreadTitle, setActiveThreadTitle] = useState<string>("New chat");
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [showThreadList, setShowThreadList] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Tracks the in-flight stream so the user can stop it mid-answer.
  const abortRef = useRef<AbortController | null>(null);

  // Ref keeps latest width for the mouseup persist handler.
  const widthRef = useRef(width);
  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  // Detect small screens for mobile sheet swap.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 1280px)");
    const update = () => setIsMobile(mq.matches);
    update();
    if (mq.addEventListener) {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);

  // Lock body scroll while the full-screen sheet is open on mobile.
  useEffect(() => {
    if (!isMobile || state !== "open") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobile, state]);

  const dragRef = useRef<{ active: boolean; startX: number; startW: number }>({
    active: false,
    startX: 0,
    startW: width,
  });

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragRef.current.active) return;
      const delta = dragRef.current.startX - e.clientX;
      const next = Math.max(
        AI_PANEL_MIN_WIDTH,
        Math.min(AI_PANEL_MAX_WIDTH, dragRef.current.startW + delta)
      );
      dispatch(setAiPanelWidth(next));
    },
    [dispatch]
  );

  const onMouseUp = useCallback(() => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    document.body.style.cursor = "";
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    persistUiPreferences({ aiPanelWidth: widthRef.current });
  }, [onMouseMove]);

  const onResizerDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { active: true, startX: e.clientX, startW: width };
    document.body.style.cursor = "col-resize";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  useEffect(
    () => () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    },
    [onMouseMove, onMouseUp]
  );

  const refreshThreadList = useCallback(async () => {
    const ts = await listAiChatThreads();
    setThreads(ts);
    return ts;
  }, []);

  const openThread = useCallback(async (threadId: string) => {
    setMessages([]);
    setErrorBanner(null);
    const data = await getAiChatThread(threadId);
    if (data) {
      setActiveThreadId(data.threadId);
      setActiveThreadTitle(data.threadTitle);
      setMessages(data.history);
    }
    setShowThreadList(false);
  }, []);

  const startNewChat = useCallback(() => {
    setActiveThreadId(null);
    setActiveThreadTitle("New chat");
    setMessages([]);
    setErrorBanner(null);
    setShowThreadList(false);
    setInput("");
  }, []);

  // Load threads + most-recent thread on first open.
  useEffect(() => {
    if (state !== "open" || historyLoaded) return;
    let cancelled = false;
    (async () => {
      const ts = await refreshThreadList();
      if (cancelled) return;
      if (ts.length > 0) {
        await openThread(ts[0].id);
      }
      if (!cancelled) setHistoryLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [state, historyLoaded, refreshThreadList, openThread]);

  // Auto-scroll to bottom whenever messages change.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, streamingText]);

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const buildPageContext = useCallback((): AiChatPageContext | undefined => {
    if (!pathname) return undefined;
    const search = searchParams?.toString() || "";
    const route = search ? `${pathname}?${search}` : pathname;
    const { pageLabel, entityIds, entity, entityId } = derivePageContext(
      pathname,
      searchParams ?? null,
    );
    let companyId: number | undefined;
    try {
      const raw = getCookie(applicationStorage.COMPANY_ID);
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) companyId = n;
    } catch {
      // best-effort only
    }
    const ctx: AiChatPageContext = { route, pageLabel };
    if (entity) ctx.entity = entity;
    if (entityId) ctx.entityId = entityId;
    if (Object.keys(entityIds).length) ctx.entityIds = entityIds;
    if (companyId !== undefined) ctx.companyId = companyId;
    return ctx;
  }, [pathname, searchParams]);

  const submitMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      setErrorBanner(null);
      setSending(true);
      setStreamingText("");

      const pageContext = buildPageContext();

      // Optimistic user message so it appears immediately.
      const optimistic: AiChatMessage = {
        id: `tmp-${Date.now()}`,
        role: "user",
        content: trimmed,
        ts: new Date().toISOString(),
        pageContext,
      };
      setMessages((prev) => [...prev, optimistic]);
      setInput("");

      const controller = new AbortController();
      abortRef.current = controller;

      await streamAiChatMessage(trimmed, {
        threadId: activeThreadId || undefined,
        pageContext,
        signal: controller.signal,
        onDelta: (chunk) => {
          setStreamingText((prev) => prev + chunk);
        },
        onDone: (res: any) => {
          if (res.history && res.history.length > 0) {
            setMessages(res.history);
          }
          if (res.threadId) {
            setActiveThreadId(res.threadId);
            if (res.threadTitle) setActiveThreadTitle(res.threadTitle);
          }
          if (res.status !== "SUCCESS" && res.message) {
            setErrorBanner(res.message);
          }
          refreshThreadList();
          setStreamingText("");
          setSending(false);
          abortRef.current = null;
        },
        onError: (msg) => {
          setErrorBanner(msg);
          setStreamingText("");
          setSending(false);
          abortRef.current = null;
        },
        onAborted: () => {
          // The backend persists whatever was streamed so far as the
          // assistant message. Refresh history to pick up the canonical
          // record (with stable id + status), and clear the streaming
          // bubble so it isn't shown twice.
          setStreamingText("");
          setSending(false);
          abortRef.current = null;
          fetchAiChatHistory().then((h) => {
            if (h && h.length > 0) setMessages(h);
          });
        },
      });
    },
    [sending, activeThreadId, refreshThreadList, buildPageContext]
  );

  const onStop = useCallback(() => {
    if (!sending) return;
    try {
      abortRef.current?.abort();
    } catch {
      /* noop */
    }
  }, [sending]);

  // Make sure we don't leave a stream running if the panel unmounts.
  useEffect(
    () => () => {
      try {
        abortRef.current?.abort();
      } catch {
        /* noop */
      }
    },
    []
  );

  const onComposerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage(input);
  };

  const onDeleteThread = async (threadId: string) => {
    if (sending) return;
    if (!window.confirm("Delete this conversation? This cannot be undone.")) return;
    const ok = await deleteAiChatThread(threadId);
    if (!ok) return;
    const remaining = await refreshThreadList();
    if (activeThreadId === threadId) {
      if (remaining.length > 0) {
        await openThread(remaining[0].id);
      } else {
        startNewChat();
      }
    }
  };

  const beginRename = (t: AiChatThreadSummary) => {
    setRenamingId(t.id);
    setRenameDraft(t.title);
  };

  const commitRename = async () => {
    if (!renamingId) return;
    const id = renamingId;
    const title = renameDraft.trim();
    setRenamingId(null);
    if (!title) return;
    const updated = await renameAiChatThread(id, title);
    if (updated) {
      setThreads((prev) =>
        prev.map((t) => (t.id === id ? { ...t, title: updated.title } : t))
      );
      if (activeThreadId === id) setActiveThreadTitle(updated.title);
    }
  };

  // Mobile/tablet: floating button + full-screen sheet.
  if (isMobile) {
    if (state !== "open") {
      return (
        <button
          type="button"
          className={styles.hideToggle}
          title="Show AI assistant"
          aria-label="Show AI assistant"
          onClick={() => {
            dispatch(setAiPanelState("open"));
            persistUiPreferences({ aiPanelState: "open" });
          }}
        >
          <i className="fa-light fa-message-bot"></i>
        </button>
      );
    }
  }

  if (state === "hidden") {
    return (
      <button
        type="button"
        className={styles.hideToggle}
        title="Show AI assistant"
        aria-label="Show AI assistant"
        onClick={() => {
          dispatch(setAiPanelState("rail"));
          persistUiPreferences({ aiPanelState: "rail" });
        }}
      >
        <i className="fa-light fa-message-bot"></i>
      </button>
    );
  }

  if (state === "rail") {
    return (
      <aside
        className={`${styles.aiPanel} ${styles.rail}`}
        aria-label="AI assistant rail"
        data-state="rail"
      >
        <button
          type="button"
          className={styles.railIcon}
          title="Expand AI assistant"
          aria-label="Expand AI assistant"
          onClick={() => {
            dispatch(setAiPanelState("open"));
            persistUiPreferences({ aiPanelState: "open" });
          }}
        >
          <i className="fa-light fa-message-bot"></i>
        </button>
        <button
          type="button"
          className={styles.railIcon}
          title="Hide AI assistant"
          aria-label="Hide AI assistant"
          onClick={() => {
            dispatch(setAiPanelState("hidden"));
            persistUiPreferences({ aiPanelState: "hidden" });
          }}
        >
          <i className="fa-light fa-xmark"></i>
        </button>
      </aside>
    );
  }

  const closeOnMobile = () => {
    dispatch(setAiPanelState("hidden"));
    persistUiPreferences({ aiPanelState: "hidden" });
  };

  const showGreeting = messages.length === 0;

  return (
    <>
      {isMobile && (
        <button
          type="button"
          className={styles.mobileBackdrop}
          aria-label="Close AI assistant"
          onClick={closeOnMobile}
        />
      )}
      <aside
        className={`${styles.aiPanel}${isMobile ? ` ${styles.aiPanelMobile}` : ""}`}
        aria-label="AI assistant"
        data-state="open"
        style={
          isMobile ? undefined : { width: `${width}px`, minWidth: `${width}px` }
        }
      >
        <div
          className={styles.resizer}
          onMouseDown={onResizerDown}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize AI assistant"
        />

        <div className={styles.header}>
          <button
            type="button"
            className={styles.iconBtn}
            title={showThreadList ? "Hide chat list" : "Show chat list"}
            aria-label={showThreadList ? "Hide chat list" : "Show chat list"}
            aria-pressed={showThreadList}
            onClick={() => setShowThreadList((v) => !v)}
          >
            <i className="fa-light fa-bars"></i>
          </button>
          <h5 className={styles.headerTitle} title={activeThreadTitle}>
            {activeThreadTitle || "AI Assistant"}
            <span className={styles.beta}>BETA</span>
          </h5>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.iconBtn}
              title="New chat"
              aria-label="Start a new chat"
              onClick={startNewChat}
              disabled={sending}
            >
              <i className="fa-light fa-pen-to-square"></i>
            </button>
            {!isMobile && (
              <button
                type="button"
                className={styles.iconBtn}
                title="Collapse to rail"
                aria-label="Collapse AI assistant to rail"
                onClick={() => {
                  dispatch(setAiPanelState("rail"));
                  persistUiPreferences({ aiPanelState: "rail" });
                }}
              >
                <i className="fa-light fa-chevrons-right"></i>
              </button>
            )}
            <button
              type="button"
              className={styles.iconBtn}
              title="Hide AI assistant"
              aria-label="Hide AI assistant"
              onClick={closeOnMobile}
            >
              <i className="fa-light fa-xmark"></i>
            </button>
          </div>
        </div>

        {showFollowingBadge && (
          <Link
            href={AppRoutes.USER_PROFILE}
            className={styles.followingBadge}
            title="AI is following your current page. Click to manage live-follow."
            aria-label={`AI is following ${liveFollowPageLabel}. Click to manage live-follow setting.`}
          >
            <i className="fa-light fa-eye" aria-hidden="true"></i>
            <span className={styles.followingBadgeLabel}>
              Following: {liveFollowPageLabel}
            </span>
          </Link>
        )}

        {showThreadList && (
          <div className={styles.threadList} aria-label="Chat list">
            <div className={styles.threadListHeader}>
              <span>Your chats</span>
              <button
                type="button"
                className={styles.newChatBtn}
                onClick={async () => {
                  startNewChat();
                  // Optionally pre-create an empty thread so it shows in the list
                  const t = await createAiChatThread();
                  if (t) {
                    setActiveThreadId(t.id);
                    setActiveThreadTitle(t.title);
                    refreshThreadList();
                  }
                }}
                disabled={sending}
              >
                <i className="fa-light fa-plus"></i> New chat
              </button>
            </div>
            {threads.length === 0 && (
              <div className={styles.threadEmpty}>
                No conversations yet. Ask a question to start one.
              </div>
            )}
            {threads.map((t) => {
              const isActive = t.id === activeThreadId;
              const isRenaming = renamingId === t.id;
              return (
                <div
                  key={t.id}
                  className={`${styles.threadItem} ${
                    isActive ? styles.threadItemActive : ""
                  }`}
                >
                  {isRenaming ? (
                    <input
                      autoFocus
                      className={styles.threadRenameInput}
                      value={renameDraft}
                      maxLength={200}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className={styles.threadItemBtn}
                      onClick={() => openThread(t.id)}
                      title={t.title}
                    >
                      <span className={styles.threadTitle}>{t.title}</span>
                      <span className={styles.threadMeta}>
                        {formatThreadDate(t.lastMessageAt || t.createdAt)}
                      </span>
                    </button>
                  )}
                  {!isRenaming && (
                    <div className={styles.threadActions}>
                      <button
                        type="button"
                        className={styles.threadActionBtn}
                        title="Rename"
                        aria-label="Rename conversation"
                        onClick={() => beginRename(t)}
                      >
                        <i className="fa-light fa-pen"></i>
                      </button>
                      <button
                        type="button"
                        className={styles.threadActionBtn}
                        title="Delete"
                        aria-label="Delete conversation"
                        onClick={() => onDeleteThread(t.id)}
                      >
                        <i className="fa-light fa-trash"></i>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className={styles.body} ref={scrollRef}>
          {showGreeting && (
            <section className={styles.greeting} aria-label="AI greeting">
              Hi! I&apos;m your Pay&nbsp;Trade assistant. Ask me anything about
              BIF, QBCC, payment claims, retentions, or how to use PayTrade.
              <div className={styles.suggestRow}>
                {SUGGESTIONS.map((s) => (
                  <button
                    type="button"
                    key={s.label}
                    className={styles.suggestChip}
                    onClick={() => submitMessage(s.prompt)}
                    disabled={sending}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`${styles.msg} ${
                m.role === "user" ? styles.msgUser : styles.msgAi
              }`}
            >
              <div className={styles.msgBubble}>
                {m.role === "assistant" ? (
                  <MarkdownMessage text={m.content} />
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}

          {sending && streamingText && (
            <div className={`${styles.msg} ${styles.msgAi}`}>
              <div className={styles.msgBubble}>
                <MarkdownMessage text={streamingText} />
              </div>
            </div>
          )}

          {sending && !streamingText && (
            <div className={`${styles.msg} ${styles.msgAi}`}>
              <div className={`${styles.msgBubble} ${styles.msgTyping}`}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
            </div>
          )}

          {errorBanner && (
            <div className={styles.errorBanner} role="alert">
              {errorBanner}
            </div>
          )}
        </div>

        <form className={styles.composer} onSubmit={onComposerSubmit}>
          <div className={styles.composerRow}>
            <input
              className={styles.composerInput}
              placeholder="Ask me anything about Pay Trade…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              aria-label="AI assistant message"
              maxLength={500}
            />
            {sending ? (
              <button
                type="button"
                className={styles.sendBtn}
                onClick={onStop}
                title="Stop"
                aria-label="Stop generating"
              >
                <i className="fa-light fa-stop"></i>
              </button>
            ) : (
              <button
                type="submit"
                className={styles.sendBtn}
                disabled={!input.trim()}
                title="Send"
                aria-label="Send message"
              >
                <i className="fa-light fa-arrow-up"></i>
              </button>
            )}
          </div>
          <div className={styles.composerFoot}>
            <span>{sending ? "Thinking…" : "AI is ready — pilot"}</span>
            <span>GPT-4o</span>
          </div>
        </form>
      </aside>
    </>
  );
}
