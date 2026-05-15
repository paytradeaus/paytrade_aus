"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AI_PANEL_MAX_WIDTH,
  AI_PANEL_MIN_WIDTH,
  setAiPanelState,
  setAiPanelWidth,
} from "@/redux/slices/uiPreferences";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import {
  AiChatMessage,
  clearAiChatHistory,
  fetchAiChatHistory,
  persistUiPreferences,
  sendAiChatMessage,
} from "@/network/uiPreferences";
import styles from "./aiPanel.module.css";

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

export default function AiPanel() {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s: RootState) => s.uiPreferences.aiPanelState);
  const width = useAppSelector((s: RootState) => s.uiPreferences.aiPanelWidth);

  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Ref keeps latest width for the mouseup persist handler.
  const widthRef = useRef(width);
  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  // Detect small screens so we can swap the desktop three-column UX for
  // a floating button + full-screen sheet. The breakpoint matches the
  // CSS media query that hides the inline panel.
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
    // Safari < 14 fallback
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

  // Load chat history once when panel first opens.
  useEffect(() => {
    if (state !== "open" || historyLoaded) return;
    let cancelled = false;
    fetchAiChatHistory().then((h) => {
      if (cancelled) return;
      setMessages(h);
      setHistoryLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [state, historyLoaded]);

  // Auto-scroll to bottom whenever messages change.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const submitMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      setErrorBanner(null);
      setSending(true);

      // Optimistic user message so it appears immediately.
      const optimistic: AiChatMessage = {
        id: `tmp-${Date.now()}`,
        role: "user",
        content: trimmed,
        ts: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      setInput("");

      const res = await sendAiChatMessage(trimmed);
      if (res.history && res.history.length > 0) {
        setMessages(res.history);
      }
      if (res.status !== "SUCCESS" && res.message) {
        setErrorBanner(res.message);
      }
      setSending(false);
    },
    [sending]
  );

  const onComposerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage(input);
  };

  const onClear = async () => {
    if (sending) return;
    setMessages([]);
    setErrorBanner(null);
    await clearAiChatHistory();
  };

  // Mobile/tablet: use a floating action button + full-screen sheet
  // instead of the desktop rail/inline layouts. The rail state doesn't
  // make sense on a phone, so we collapse it into "show the FAB".
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
          <h5>
            AI Assistant<span className={styles.beta}>BETA</span>
          </h5>
          <div className={styles.headerActions}>
            {messages.length > 0 && (
              <button
                type="button"
                className={styles.iconBtn}
                title="Clear chat"
                aria-label="Clear chat history"
                onClick={onClear}
              >
                <i className="fa-light fa-trash"></i>
              </button>
            )}
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
              <div className={styles.msgBubble}>{m.content}</div>
            </div>
          ))}

          {sending && (
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
            <button
              type="submit"
              className={styles.sendBtn}
              disabled={sending || !input.trim()}
              title="Send"
              aria-label="Send message"
            >
              <i className="fa-light fa-arrow-up"></i>
            </button>
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
