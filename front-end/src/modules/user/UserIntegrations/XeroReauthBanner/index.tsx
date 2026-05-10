"use client";

/**
 * Task #42 — Cross-page banner that surfaces a "Reconnect to Xero" CTA
 * whenever the backend signals the refresh token is dead
 * (`ApiResponse.XERO_REFRESH`). The previous behaviour was a silent
 * `window.open(consentUrl, "_self")` from inside data-fetching helpers,
 * which would yank the user out of whatever screen they were on (often
 * blanking forms mid-edit) without telling them why. This banner lets
 * the user choose when to leave PT, and keeps the rest of the page
 * intact in the meantime.
 *
 * Task #109 — The banner now also polls a backend reauth-status probe so
 * it lights up on every screen the moment the hourly Xero scheduler
 * marks the company as needing reauth, not just after the user happens
 * to trigger an `XERO_REFRESH` response. Mounted once in the user
 * `(protected)` layout so it follows the user across the app.
 */
import React, { useEffect, useState } from "react";
import {
  XERO_REAUTH_EVENT,
  XERO_REAUTH_URL_KEY,
  clearXeroReauthRequired,
  fetchXeroReauthStatus,
  handleXeroReauthRequired,
} from "../integration.functions";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 min

const XeroReauthBanner: React.FC = () => {
  const [reauthUrl, setReauthUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(XERO_REAUTH_URL_KEY);
      if (stored) setReauthUrl(stored);
    } catch {}

    const handler = (e: any) => {
      const url = e?.detail?.url;
      if (url) setReauthUrl(url);
      else setReauthUrl(null);
    };
    window.addEventListener(XERO_REAUTH_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(XERO_REAUTH_EVENT, handler as EventListener);
    };
  }, []);

  // Task #109 — Poll the backend so the banner appears even when the
  // user hasn't triggered a Xero call themselves. Clears the local CTA
  // automatically once the server reports the connection has been
  // re-OAuthed.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    const probe = async () => {
      const res = await fetchXeroReauthStatus();
      if (cancelled || !res) return;
      if (res.needs_reauth) {
        // Always surface the banner once the backend says reauth is
        // needed. If consent-URL generation transiently failed on the
        // server, fall back to the Xero settings deep link so the user
        // can still get there in one click.
        const url = res.reauth_url || "/user/integrations/xero/settings";
        handleXeroReauthRequired(url);
      } else {
        try {
          const stored = localStorage.getItem(XERO_REAUTH_URL_KEY);
          if (stored) {
            clearXeroReauthRequired();
            setReauthUrl(null);
          }
        } catch {}
      }
    };

    probe();
    const intervalId = window.setInterval(probe, POLL_INTERVAL_MS);
    const onFocus = () => probe();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (!reauthUrl) return null;

  return (
    <div
      role="alert"
      style={{
        background: "#FFF4E5",
        border: "1px solid #F5A623",
        color: "#7A4F01",
        padding: "12px 16px",
        borderRadius: 6,
        margin: "12px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div>
        <strong>Xero reconnection required.</strong>{" "}
        Your Xero session has expired. PayTrade kept the rest of this
        page intact — please reconnect when you're ready. Until you do,
        invoices, bills and contacts won't sync.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => {
            const url = reauthUrl;
            clearXeroReauthRequired();
            setReauthUrl(null);
            if (url) window.open(url, "_self");
          }}
          style={{
            background: "#F5A623",
            color: "#fff",
            border: "none",
            padding: "8px 14px",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Reconnect to Xero
        </button>
        <button
          type="button"
          onClick={() => {
            clearXeroReauthRequired();
            setReauthUrl(null);
          }}
          style={{
            background: "transparent",
            color: "#7A4F01",
            border: "1px solid #C8995A",
            padding: "8px 14px",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default XeroReauthBanner;
