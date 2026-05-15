"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AI_PANEL_MAX_WIDTH,
  AI_PANEL_MIN_WIDTH,
  setAiPanelState,
  setAiPanelWidth,
} from "@/redux/slices/uiPreferences";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { persistUiPreferences } from "@/network/uiPreferences";
import styles from "./aiPanel.module.css";

export default function AiPanel() {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s: RootState) => s.uiPreferences.aiPanelState);
  const width = useAppSelector((s: RootState) => s.uiPreferences.aiPanelWidth);

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

      <div className={styles.body}>
        <section
          className={styles.section}
          aria-label="System status placeholder"
        >
          <div className={styles.sectionTitle}>
            <span>System Status</span>
            <span style={{ fontWeight: 400, textTransform: "none" }}>
              <small>Today</small>
            </span>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.statusPill}>— Critical</span>
            <span className={styles.statusPill}>— Warnings</span>
            <span className={styles.statusPill}>— Info</span>
          </div>
        </section>

        <section
          className={styles.section}
          aria-label="Outstanding approvals placeholder"
        >
          <div className={styles.sectionTitle}>
            <span>Outstanding Approvals</span>
            <span className={styles.sectionTitleCount}>—</span>
          </div>
          <div className={styles.placeholderRow}>
            <strong>No outstanding approvals</strong>
            <span>Items awaiting your review will appear here.</span>
          </div>
        </section>

        <section
          className={styles.section}
          aria-label="Uploads requested placeholder"
        >
          <div className={styles.sectionTitle}>
            <span>Uploads Requested</span>
            <span className={styles.sectionTitleCount}>—</span>
          </div>
          <div className={styles.placeholderRow}>
            <strong>Nothing to upload right now</strong>
            <span>Documents the AI needs from you will appear here.</span>
          </div>
        </section>

        <section className={styles.greeting} aria-label="AI greeting">
          Hi! I&apos;m your Pay&nbsp;Trade assistant. Once enabled, I&apos;ll
          review your dashboard and surface what needs your attention. Chat
          isn&apos;t connected yet — this panel is currently a preview.
          <div className={styles.suggestRow}>
            <span className={styles.suggestChip}>Fix critical issues</span>
            <span className={styles.suggestChip}>Review payments</span>
            <span className={styles.suggestChip}>Reconcile trusts</span>
            <span className={styles.suggestChip}>Draft notices</span>
          </div>
        </section>
      </div>

      <div className={styles.composer}>
        <div className={styles.composerRow}>
          <input
            className={styles.composerInput}
            placeholder="Ask me anything about Pay Trade…"
            disabled
            aria-disabled="true"
            aria-label="AI assistant message (disabled — coming soon)"
          />
          <button
            type="button"
            className={styles.sendBtn}
            disabled
            aria-disabled="true"
            title="Coming soon"
            aria-label="Send (coming soon)"
          >
            <i className="fa-light fa-arrow-up"></i>
          </button>
        </div>
        <div className={styles.composerFoot}>
          <span>AI is ready — pilot</span>
          <span>GPT-4o</span>
        </div>
      </div>
      </aside>
    </>
  );
}
