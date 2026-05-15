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
  persistUiPreferences,
} from "@/network/uiPreferences";
import {
  AiChatRunSummary,
  AiChatStreamEvent,
  AiConversationSummary,
  deleteAiConversation,
  fetchAiStatusSnapshot,
  AiStatusSnapshotResponse,
  getAiConversation,
  listAiConversations,
  renameAiConversation,
  sendAiChatStreaming,
  stopAiChatRun,
} from "@/network/aiChat";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { applicationStorage } from "@/shared/constant/general";
import { fetchAiBillingOverview } from "@/modules/user/AiBilling/aiBilling.functions";
import { useTokenDetails } from "@/hooks";
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

// Capability examples shown in the "What can I ask?" panel.
// Each entry maps to a backend AI tool exposed by the orchestrator so users
// can quickly discover what the assistant is able to look at.
const CAPABILITY_EXAMPLES: { label: string; prompt: string }[] = [
  {
    label: "What needs my attention right now?",
    prompt: "Look at my system status snapshot and tell me what I should fix first.",
  },
  {
    label: "Show payment claims with issues",
    prompt: "Show me payment claims that have problems or are overdue.",
  },
  {
    label: "Which contacts are missing details?",
    prompt: "Which contacts are missing an email address or other key details?",
  },
  {
    label: "Which projects need attention?",
    prompt: "List my projects that have configuration or compliance issues.",
  },
  {
    label: "How much retention am I holding?",
    prompt: "Summarise the cash retentions I am currently holding.",
  },
  {
    label: "What are my trust account balances?",
    prompt: "Show me my PTA and RTA trust account balances.",
  },
  {
    label: "Is my Xero connected?",
    prompt: "Check the Xero sync status for my company and flag anything broken.",
  },
  {
    label: "Take me to a screen",
    prompt: "Take me to the page where I can review my outstanding payment claims.",
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
  const uiPrefsHydrated = useAppSelector(
    (s: RootState) => s.uiPreferences.hydrated,
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

  const [threads, setThreads] = useState<AiConversationSummary[]>([]);
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
  const [showCapabilities, setShowCapabilities] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const { decodeTokenData }: any = useTokenDetails();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  // True when the current composer value was loaded via the Up-arrow
  // shortcut, so Down/Escape can clear it without interfering with the
  // user's own typing.
  const upArrowLoadedRef = useRef(false);
  // Tracks the in-flight stream so the user can stop it mid-answer.
  const abortRef = useRef<AbortController | null>(null);

  // Load a previous user message into the composer so the user can tweak
  // the wording before re-sending instead of just retrying verbatim.
  const editMessage = useCallback((text: string, fromShortcut = false) => {
    setInput(text);
    upArrowLoadedRef.current = fromShortcut;
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

  // Pull the user's current AI credit balance for the composer footer so
  // they can see at a glance how much they have left. Refetched once on
  // mount, when the conversation changes, and immediately *after* a send
  // finishes — never while sending is in-flight, to avoid double fetches.
  // On any failure or invalid company id we clear the cached value so the
  // footer falls back to the read-only label rather than showing stale
  // numbers.
  const prevSendingRef = useRef(false);
  useEffect(() => {
    const justFinishedSending = prevSendingRef.current && !sending;
    prevSendingRef.current = sending;
    if (sending && !justFinishedSending) return;
    const cid = Number(
      decodeTokenData?.company_id ??
        (typeof window !== "undefined"
          ? localStorage.getItem("companyId")
          : null),
    );
    if (!Number.isFinite(cid) || cid <= 0) {
      setCreditBalance(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const overview = await fetchAiBillingOverview(cid);
        if (cancelled) return;
        if (overview && typeof overview.balance_usd === "number") {
          setCreditBalance(overview.balance_usd);
        } else {
          setCreditBalance(null);
        }
      } catch {
        if (!cancelled) setCreditBalance(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [decodeTokenData?.company_id, sending, conversationId]);

  // Drop a capability example into the composer so the user can tweak it
  // before sending. Closes the capabilities panel after picking one.
  const fillExample = useCallback(
    (text: string) => {
      editMessage(text);
      setShowCapabilities(false);
    },
    [editMessage],
  );

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
    const ts = await listAiConversations();
    setThreads(ts);
    return ts;
  }, []);

  const openThread = useCallback(async (threadId: string) => {
    setMessages([]);
    setErrorBanner(null);
    const data = await getAiConversation(threadId);
    if (data) {
      setActiveThreadId(data.id);
      setActiveThreadTitle(data.title);
      setConversationId(data.id);
      const hydrated: ChatMessage[] = (data.messages || []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        ts: m.ts,
        status: m.status ?? null,
        pageContext: (m.pageContext as AiChatPageContext | null) ?? null,
      }));
      setMessages(hydrated);
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
          // First message in a brand-new chat: track the new
          // conversation as the active thread so the sidebar
          // highlights it once the list refreshes.
          setActiveThreadId((cur) => cur ?? event.conversationId);
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
          const liveErrorReason =
            event.status !== "stopped"
              ? (event.errorReason && event.errorReason.trim()) ||
                (event.errorMessage && event.errorMessage.trim()) ||
                undefined
              : undefined;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    pending: false,
                    runSummary: event.summary,
                    runStatus: event.status,
                    errorReason: liveErrorReason ?? m.errorReason,
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
    const ok = await deleteAiConversation(threadId);
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

  const beginRename = (t: AiConversationSummary) => {
    setRenamingId(t.id);
    setRenameDraft(t.title);
  };

  const commitRename = async () => {
    if (!renamingId) return;
    const id = renamingId;
    const title = renameDraft.trim();
    setRenamingId(null);
    if (!title) return;
    const updated = await renameAiConversation(id, title);
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

  // Gate the entire panel (including mobile launcher) behind the user's
  // "Enable AI assistant" toggle in Personal Info. Until they've explicitly
  // enabled it (with the one-time access password) nothing AI-related
  // renders. We wait for UI-preferences hydration so we don't briefly flash
  // the panel/launcher on first load before the real preference arrives.
  if (!uiPrefsHydrated) return null;
  if (!liveFollowEnabled) return null;

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
          <i className="fa-solid fa-chevron-left"></i>
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
            {!isMobile && (
              <button
                type="button"
                className={styles.iconBtn}
                title="Collapse AI assistant to rail"
                aria-label="Collapse AI assistant to rail"
                onClick={() => {
                  dispatch(setAiPanelState("rail"));
                  persistUiPreferences({ aiPanelState: "rail" });
                }}
              >
                <i className="fa-light fa-sidebar-flip"></i>
              </button>
            )}
            <button
              type="button"
              className={styles.iconBtn}
              title={
                showCapabilities
                  ? "Hide what I can do"
                  : "What can I ask the assistant?"
              }
              aria-label={
                showCapabilities
                  ? "Hide AI assistant capabilities"
                  : "Show AI assistant capabilities"
              }
              aria-expanded={showCapabilities}
              aria-controls="ai-capabilities-panel"
              onClick={() => setShowCapabilities((v) => !v)}
            >
              <i className="fa-light fa-circle-question"></i>
            </button>
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
                onClick={() => {
                  // Conversations are created server-side on the
                  // first persisted message, so we just clear local
                  // state here and let the next send seed it.
                  startNewChat();
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
            const persistedStatus =
              m.role === "assistant" && typeof m.status === "string"
                ? m.status.toUpperCase()
                : null;
            const wasStopped =
              m.role === "assistant" &&
              (persistedStatus === "STOPPED" || m.runStatus === "stopped");
            const wasRateLimited =
              m.role === "assistant" && persistedStatus === "RATE_LIMITED";
            const wasErrored =
              m.role === "assistant" &&
              !wasStopped &&
              (persistedStatus === "ERROR" ||
                wasRateLimited ||
                m.runStatus === "failed");
            const showRetryRow = wasStopped || wasErrored;
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
                  {showRetryRow && (() => {
                    let priorUserMsg: AiChatMessage | undefined;
                    for (let i = idx - 1; i >= 0; i--) {
                      if (messages[i].role === "user") {
                        priorUserMsg = messages[i];
                        break;
                      }
                    }
                    const pillIcon = wasStopped
                      ? "fa-light fa-circle-stop"
                      : "fa-light fa-triangle-exclamation";
                    const persistedReason =
                      typeof m.errorReason === "string" &&
                      m.errorReason.trim().length > 0
                        ? m.errorReason.trim()
                        : null;
                    const genericLabel = wasStopped
                      ? "Stopped — answer may be incomplete"
                      : wasRateLimited
                        ? "Rate limited — please try again shortly"
                        : "Error — answer could not be generated";
                    const reasonPrefix = wasStopped
                      ? "Stopped"
                      : wasRateLimited
                        ? "Rate limited"
                        : "Error";
                    const pillLabel =
                      !wasStopped && persistedReason
                        ? `${reasonPrefix} — ${persistedReason}`
                        : genericLabel;
                    const genericTitle = wasStopped
                      ? "You stopped this answer before it finished. It may be incomplete."
                      : wasRateLimited
                        ? "The assistant is rate limited. Wait a moment and retry."
                        : "Something went wrong while generating this answer.";
                    const pillTitle =
                      !wasStopped && persistedReason
                        ? persistedReason
                        : genericTitle;
                    return (
                      <div className={styles.stoppedRow}>
                        <span
                          className={styles.stoppedPill}
                          title={pillTitle}
                        >
                          <i
                            className={pillIcon}
                            aria-hidden="true"
                          ></i>
                          {pillLabel}
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
                        {wasStopped && (
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
                        )}
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

        {showCapabilities && (
          <div
            id="ai-capabilities-panel"
            className={styles.capabilitiesPanel}
            role="region"
            aria-label="What you can ask the AI assistant"
          >
            <div className={styles.capabilitiesHead}>
              <span className={styles.capabilitiesTitle}>
                What can I ask?
              </span>
              <button
                type="button"
                className={styles.capabilitiesClose}
                title="Hide"
                aria-label="Hide capabilities"
                onClick={() => setShowCapabilities(false)}
              >
                <i className="fa-light fa-xmark"></i>
              </button>
            </div>
            <p className={styles.capabilitiesIntro}>
              Click an example to drop it into the message box, then tweak
              and send.
            </p>
            <div className={styles.capabilitiesList}>
              {CAPABILITY_EXAMPLES.map((ex) => (
                <button
                  type="button"
                  key={ex.label}
                  className={styles.capabilityItem}
                  onClick={() => fillExample(ex.prompt)}
                  disabled={sending}
                  title={ex.prompt}
                >
                  <i
                    className="fa-light fa-arrow-up-right-from-square"
                    aria-hidden="true"
                  ></i>
                  <span>{ex.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form className={styles.composer} onSubmit={onComposerSubmit}>
          <textarea
            ref={composerInputRef}
            className={styles.composerInput}
            placeholder="Ask me anything about Pay Trade…"
            value={input}
            rows={1}
            onChange={(e) => {
              // User typing/clearing manually invalidates the up-arrow
              // shortcut state so Down/Escape no longer clears their input.
              upArrowLoadedRef.current = false;
              setInput(e.target.value);
              // Auto-grow: reset then size to scrollHeight (capped via CSS
              // max-height which then enables an inner scroll).
              const el = e.target as HTMLTextAreaElement;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
            }}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter inserts a newline (standard chat UX).
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (!sending && input.trim()) {
                  onComposerSubmit(
                    e as unknown as React.FormEvent<HTMLFormElement>,
                  );
                }
                return;
              }
              // Power-user shortcut: when the composer is empty, Up loads
              // the most recent user message for editing (terminal/Slack
              // style). Down/Escape clears it again, but only if it was
              // loaded via Up — so it doesn't wipe text the user typed.
              if (e.key === "ArrowUp") {
                if (input.length > 0) return;
                for (let i = messages.length - 1; i >= 0; i--) {
                  if (messages[i].role === "user") {
                    e.preventDefault();
                    editMessage(messages[i].content, true);
                    break;
                  }
                }
              } else if (e.key === "ArrowDown" || e.key === "Escape") {
                if (upArrowLoadedRef.current && input.length > 0) {
                  e.preventDefault();
                  setInput("");
                  upArrowLoadedRef.current = false;
                }
              }
            }}
            disabled={sending}
            aria-label="AI assistant message"
            maxLength={4000}
          />
          <div className={styles.composerActions}>
            <span className={styles.composerCredit}>
              {sending
                ? "Streaming…"
                : creditBalance !== null
                  ? `Credit available: $${creditBalance.toFixed(
                      creditBalance >= 1 ? 2 : 4,
                    )}`
                  : "Credit unavailable"}
            </span>
            <div className={styles.composerActionsRight}>
              {sending ? (
                <button
                  type="button"
                  className={styles.stopBtn}
                  onClick={onStop}
                  title="Stop"
                  aria-label="Stop AI response"
                >
                  <i className="fa-light fa-stop"></i>
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  className={styles.sendBtn}
                  disabled={!input.trim()}
                  title="Send (Enter)"
                  aria-label="Send message"
                >
                  <i className="fa-light fa-arrow-up"></i>
                  <span>Send</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </aside>
    </>
  );
}
