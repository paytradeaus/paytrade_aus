"use client";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
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
} from "@/network/uiPreferences";
import {
  AiChatRunSummary,
  AiChatStreamEvent,
  fetchAiStatusSnapshot,
  AiStatusSnapshotResponse,
  sendAiChatStreaming,
  stopAiChatRun,
} from "@/network/aiChat";
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
    label: "What needs my attention?",
    prompt: "Look at my system status snapshot and tell me what I should fix first.",
  },
  {
    label: "Claims with issues",
    prompt: "Show me payment claims that have problems or are overdue.",
  },
  {
    label: "Contacts missing email",
    prompt: "Which contacts are missing an email address?",
  },
  {
    label: "Walk me through retentions",
    prompt: "How does PayTrade handle cash retentions on a progress claim?",
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

interface ChatMessage extends AiChatMessage {
  pending?: boolean;
  navBreadcrumbs?: { route: string; reason?: string }[];
  toolChips?: string[];
  runSummary?: AiChatRunSummary | null;
  runStatus?: "completed" | "stopped" | "failed";
}

function uid(prefix = "m"): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function formatCost(amount: number, multiplier: number): string {
  if (!amount) return "$0.00";
  return `$${amount.toFixed(amount >= 1 ? 2 : 4)}${
    multiplier && multiplier !== 1 ? ` (×${multiplier.toFixed(2)})` : ""
  }`;
}

export default function AiPanel() {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s: RootState) => s.uiPreferences.aiPanelState);
  const width = useAppSelector((s: RootState) => s.uiPreferences.aiPanelWidth);
  const liveFollowEnabled = useAppSelector(
    (s: RootState) => s.uiPreferences.aiLiveFollowEnabled,
  );
  const liveFollowPageLabel = useAppSelector(
    (s: RootState) => s.uiPreferences.aiLiveFollowPageLabel,
  );
  const showFollowingBadge =
    liveFollowEnabled &&
    !!liveFollowPageLabel &&
    liveFollowPageLabel.length > 0;
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [threads, setThreads] = useState<AiChatThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeThreadTitle, setActiveThreadTitle] = useState<string>("New chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [showThreadList, setShowThreadList] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [openContextChipId, setOpenContextChipId] = useState<string | null>(
    null,
  );
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [snapshotChip, setSnapshotChip] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const composerInputRef = useRef<HTMLInputElement | null>(null);
  // Tracks the in-flight stream so the user can stop it mid-answer.
  const abortRef = useRef<AbortController | null>(null);

  // Load a previous user message into the composer so the user can tweak
  // the wording before re-sending instead of just retrying verbatim.
  const editMessage = useCallback((text: string) => {
    setInput(text);
    requestAnimationFrame(() => {
      const el = composerInputRef.current;
      if (el) {
        el.focus();
        const len = el.value.length;
        try {
          el.setSelectionRange(len, len);
        } catch {
          /* noop */
        }
      }
    });
  }, []);

  // Close any open context popover when the user clicks elsewhere or
  // presses Escape. The popover is intentionally lightweight — no portal,
  // just a positioned div within the message group.
  useEffect(() => {
    if (!openContextChipId) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(`.${styles.contextChipWrap}`)) return;
      setOpenContextChipId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenContextChipId(null);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openContextChipId]);

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

  useEffect(() => {
    if (!isMobile || state !== "open") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobile, state]);

  // Resizer
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
        Math.min(AI_PANEL_MAX_WIDTH, dragRef.current.startW + delta),
      );
      dispatch(setAiPanelWidth(next));
    },
    [dispatch],
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
    [onMouseMove, onMouseUp],
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
      setMessages(data.history as ChatMessage[]);
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
    setConversationId(null);
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

  // Refresh status snapshot chip when panel opens.
  useEffect(() => {
    if (state !== "open") return;
    let cancelled = false;
    fetchAiStatusSnapshot().then((snap: AiStatusSnapshotResponse | null) => {
      if (cancelled) return;
      if (snap?.summary) {
        const { critical = 0, warning = 0, total = 0 } = snap.summary;
        if (total > 0) {
          setSnapshotChip(
            `${critical} critical · ${warning} warning · ${total} total`,
          );
        } else {
          setSnapshotChip(null);
        }
      } else {
        setSnapshotChip(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [state, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, streamingText]);

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

  // Note: incoming navigation_request push events are handled globally
  // by `AiLiveFollowTracker` so they work even when the panel is closed.

  const submitMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      setErrorBanner(null);
      setSending(true);
      setActiveRunId(null);

      const pageContext = buildPageContext();

      const userMsg: ChatMessage = {
        id: uid("u"),
        role: "user",
        content: trimmed,
        ts: new Date().toISOString(),
        pageContext,
      };
      const assistantId = uid("a");
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        ts: new Date().toISOString(),
        pending: true,
        navBreadcrumbs: [],
        toolChips: [],
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");

      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }));

      const controller = new AbortController();
      abortRef.current = controller;

      const onEvent = (event: AiChatStreamEvent) => {
        if (event.type === "run_started") {
          setActiveRunId(event.runId);
          setConversationId(event.conversationId);
        } else if (event.type === "text_delta") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content + event.text }
                : m,
            ),
          );
        } else if (event.type === "tool_call_started") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    toolChips: [...(m.toolChips ?? []), event.toolName],
                  }
                : m,
            ),
          );
          if (event.toolName === "requestUserViewNavigation") {
            const args = event.arguments || {};
            if (typeof args.route === "string") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        navBreadcrumbs: [
                          ...(m.navBreadcrumbs ?? []),
                          { route: args.route, reason: args.reason },
                        ],
                      }
                    : m,
                ),
              );
            }
          }
        } else if (event.type === "run_completed") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    pending: false,
                    runSummary: event.summary,
                    runStatus: event.status,
                    content:
                      m.content ||
                      event.errorMessage ||
                      "(no response from the assistant)",
                  }
                : m,
            ),
          );
          if (event.errorMessage) setErrorBanner(event.errorMessage);
          setActiveRunId(null);
          setSending(false);
          abortRef.current = null;
          // Best-effort sync of legacy thread sidebar.
          refreshThreadList();
        }
      };

      const route = pathname || undefined;
      await sendAiChatStreaming({
        message: trimmed,
        history: history.slice(-12),
        conversationId,
        pageContext: pageContext ?? (route ? { path: route } : undefined),
        signal: controller.signal,
        onEvent,
      });
    },
    [messages, sending, conversationId, pathname, refreshThreadList, buildPageContext],
  );

  // Make sure we don't leave a stream running if the panel unmounts.
  useEffect(
    () => () => {
      try {
        abortRef.current?.abort();
      } catch {
        /* noop */
      }
    },
    [],
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

  const onStop = async () => {
    if (!sending) return;
    if (activeRunId) {
      try {
        await stopAiChatRun(activeRunId);
      } catch {
        /* noop */
      }
    }
    try {
      abortRef.current?.abort();
    } catch {
      /* noop */
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
            {snapshotChip && (
              <span
                className={styles.statusChip}
                title="Open issues found by status snapshot"
              >
                <i className="fa-light fa-triangle-exclamation"></i>{" "}
                {snapshotChip}
              </span>
            )}
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
              Hi! I&apos;m your Pay&nbsp;Trade assistant. I can answer
              questions and look at your data — read-only. I cannot
              change anything for you.
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

          {messages.map((m, idx) => {
            const ctx = m.role === "user" ? m.pageContext : null;
            const chipLabel =
              ctx && (ctx.pageLabel || ctx.route)
                ? ctx.pageLabel || ctx.route
                : null;
            const detailRows: { key: string; label: string; value: string }[] =
              [];
            if (ctx?.route) {
              detailRows.push({ key: "route", label: "Route", value: ctx.route });
            }
            if (ctx?.entity) {
              detailRows.push({
                key: "entity",
                label: "Entity",
                value: ctx.entityId
                  ? `${ctx.entity} #${ctx.entityId}`
                  : ctx.entity,
              });
            }
            if (ctx?.entityIds) {
              Object.entries(ctx.entityIds).forEach(([k, v]) => {
                if (k === "entityId" && ctx.entityId === v) return;
                detailRows.push({ key: k, label: k, value: String(v) });
              });
            }
            const popoverId = `ai-ctx-pop-${m.id}`;
            const isOpen = openContextChipId === m.id;
            const wasStopped =
              m.role === "assistant" && m.status === "STOPPED";
            const navigateRoute =
              ctx?.route &&
              ctx.route.startsWith("/") &&
              !ctx.route.startsWith("//")
                ? ctx.route
                : null;
            return (
              <div
                key={m.id}
                className={`${styles.msg} ${
                  m.role === "user" ? styles.msgUser : styles.msgAi
                }`}
              >
                <div className={styles.msgGroup}>
                  <div className={styles.msgBubble}>
                    {m.role === "assistant" ? (
                      <MarkdownMessage text={m.content} />
                    ) : (
                      m.content
                    )}
                    {m.role === "user" && (
                      <button
                        type="button"
                        className={styles.userEditBtn}
                        disabled={sending}
                        title="Edit and resend this question"
                        aria-label="Edit this question"
                        onClick={() => editMessage(m.content)}
                      >
                        <i
                          className="fa-light fa-pen-to-square"
                          aria-hidden="true"
                        ></i>
                      </button>
                    )}
                  </div>
                  {chipLabel && (
                    <span
                      className={`${styles.contextChipWrap}${
                        isOpen ? ` ${styles.contextChipWrapOpen}` : ""
                      }`}
                    >
                      {navigateRoute ? (
                        <Link
                          href={navigateRoute}
                          className={styles.contextChip}
                          aria-label={`Go to the page used for this message (${chipLabel})`}
                          title={`Go to ${navigateRoute}`}
                        >
                          <i
                            className="fa-light fa-location-crosshairs"
                            aria-hidden="true"
                          ></i>
                          <span className={styles.contextChipLabel}>
                            From: {chipLabel}
                          </span>
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className={styles.contextChip}
                          aria-expanded={isOpen}
                          aria-controls={popoverId}
                          aria-label={`Show page context for this message (${chipLabel})`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenContextChipId((cur) =>
                              cur === m.id ? null : m.id,
                            );
                          }}
                        >
                          <i
                            className="fa-light fa-location-crosshairs"
                            aria-hidden="true"
                          ></i>
                          <span className={styles.contextChipLabel}>
                            From: {chipLabel}
                          </span>
                        </button>
                      )}
                      <div
                        id={popoverId}
                        role="dialog"
                        aria-label="Page context details"
                        className={styles.contextPopover}
                        hidden={!isOpen && undefined}
                      >
                        <div className={styles.contextPopoverTitle}>
                          Page context sent with this message
                        </div>
                        {detailRows.length === 0 ? (
                          <div className={styles.contextPopoverRow}>
                            <span className={styles.contextPopoverValue}>
                              {chipLabel}
                            </span>
                          </div>
                        ) : (
                          detailRows.map((row) => (
                            <div
                              key={row.key}
                              className={styles.contextPopoverRow}
                            >
                              <span className={styles.contextPopoverLabel}>
                                {row.label}
                              </span>
                              <span className={styles.contextPopoverValue}>
                                {row.value}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </span>
                  )}
                  {wasStopped && (() => {
                    let priorUserMsg: AiChatMessage | undefined;
                    for (let i = idx - 1; i >= 0; i--) {
                      if (messages[i].role === "user") {
                        priorUserMsg = messages[i];
                        break;
                      }
                    }
                    return (
                      <div className={styles.stoppedRow}>
                        <span
                          className={styles.stoppedPill}
                          title="You stopped this answer before it finished. It may be incomplete."
                        >
                          <i
                            className="fa-light fa-circle-stop"
                            aria-hidden="true"
                          ></i>
                          Stopped — answer may be incomplete
                        </span>
                        {priorUserMsg && (
                          <button
                            type="button"
                            className={styles.stoppedAction}
                            disabled={sending}
                            title="Re-ask the original question"
                            aria-label="Retry original question"
                            onClick={() => submitMessage(priorUserMsg!.content)}
                          >
                            <i
                              className="fa-light fa-rotate-right"
                              aria-hidden="true"
                            ></i>
                            Retry
                          </button>
                        )}
                        {priorUserMsg && (
                          <button
                            type="button"
                            className={styles.stoppedAction}
                            disabled={sending}
                            title="Edit the question and send again"
                            aria-label="Edit original question"
                            onClick={() => editMessage(priorUserMsg!.content)}
                          >
                            <i
                              className="fa-light fa-pen-to-square"
                              aria-hidden="true"
                            ></i>
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          className={styles.stoppedAction}
                          disabled={sending}
                          title="Ask the assistant to continue from where it stopped"
                          aria-label="Continue the previous answer"
                          onClick={() =>
                            submitMessage(
                              "Please continue your previous answer from where you stopped. Do not repeat what you already said.",
                            )
                          }
                        >
                          <i
                            className="fa-light fa-forward"
                            aria-hidden="true"
                          ></i>
                          Continue
                        </button>
                      </div>
                    );
                  })()}
                  {m.navBreadcrumbs && m.navBreadcrumbs.length > 0 && (
                    <div>
                      {m.navBreadcrumbs.map((b, i) => (
                        <div key={i} className={styles.navBreadcrumb}>
                          {liveFollowEnabled
                            ? `Took you to ${b.route}`
                            : `Suggested ${b.route}`}
                          {b.reason ? ` — ${b.reason}` : ""}
                        </div>
                      ))}
                    </div>
                  )}
                  {m.toolChips && m.toolChips.length > 0 && (
                    <div>
                      {m.toolChips.map((t, i) => (
                        <span key={`${t}-${i}`} className={styles.toolChip}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {m.runSummary && !m.pending && (
                    <div>
                      <span
                        className={styles.runChip}
                        title={`${m.runSummary.totalTokens} tokens · ${m.runSummary.toolCallCount} tool call(s) · ${m.runSummary.durationMs}ms`}
                      >
                        <span
                          className={`${styles.runChipDot} ${
                            m.runStatus === "failed"
                              ? styles.runChipDotFailed
                              : m.runStatus === "stopped"
                                ? styles.runChipDotStopped
                                : ""
                          }`}
                        />
                        {m.runStatus === "stopped"
                          ? "Stopped"
                          : m.runStatus === "failed"
                            ? "Failed"
                            : "Done"}{" "}
                        · {formatCost(
                          m.runSummary.amountChargedUsd,
                          m.runSummary.multiplier,
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

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
              ref={composerInputRef}
              className={styles.composerInput}
              placeholder="Ask me anything about Pay Trade…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              aria-label="AI assistant message"
              maxLength={4000}
            />
            {sending ? (
              <button
                type="button"
                className={styles.stopBtn}
                onClick={onStop}
                title="Stop"
                aria-label="Stop AI response"
              >
                <i className="fa-light fa-stop"></i> Stop
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
            <span>
              {sending
                ? "Streaming…"
                : liveFollowEnabled
                  ? "Read-only · live-follow on"
                  : "Read-only"}
            </span>
            <span>GPT-4o</span>
          </div>
        </form>
      </aside>
    </>
  );
}
