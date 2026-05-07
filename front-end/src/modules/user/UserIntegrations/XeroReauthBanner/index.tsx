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
 */
import React, { useEffect, useState } from "react";
import {
  XERO_REAUTH_EVENT,
  XERO_REAUTH_URL_KEY,
  clearXeroReauthRequired,
} from "../integration.functions";

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
    };
    window.addEventListener(XERO_REAUTH_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(XERO_REAUTH_EVENT, handler as EventListener);
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
        page intact — please reconnect when you're ready.
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
