"use client";
import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { RootState, useAppSelector } from "@/redux/store";
import { recordAiLiveFollowContext } from "@/network/uiPreferences";
import { deriveContext } from "@/components/AiLiveFollowTracker/deriveContext";

export interface ReportAiContextInput {
  /**
   * Optional one-line summary of what is on screen
   * (e.g. `"Project: Acme Tower, status: Active"`).
   */
  summary?: string | null;
  /**
   * Optional map of human-readable facts about the page contents
   * (e.g. `{ project: "Acme Tower", status: "Active" }`). Up to 10
   * entries are forwarded to the backend; values longer than 200 chars
   * are truncated.
   */
  facts?: Record<string, string | number | null | undefined> | null;
}

/**
 * Lets a page voluntarily report 1–2 human-readable facts about its
 * contents to the AI live-follow context, so the AI assistant can ground
 * its next answer in what's actually on screen (not just the URL).
 *
 * - No-op when `aiLiveFollowEnabled` is off (privacy: nothing is sent).
 * - Re-sends only when the route or the reported summary/facts change.
 * - When both `summary` and `facts` are empty, the hook stays quiet —
 *   it never sends a "clearing" payload. Previously reported facts on
 *   the same route remain in the backend cache until they're replaced
 *   by another report, the user navigates away (route change replaces
 *   the cache wholesale), the 10-minute TTL elapses, or the live-follow
 *   flag is turned off.
 */
export function useReportAiContext({
  summary,
  facts,
}: ReportAiContextInput): void {
  const enabled = useAppSelector(
    (s: RootState) => s.uiPreferences.aiLiveFollowEnabled,
  );
  const hydrated = useAppSelector((s: RootState) => s.uiPreferences.hydrated);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastSentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!enabled) {
      lastSentRef.current = null;
      return;
    }
    if (!pathname) return;

    const trimmedSummary =
      typeof summary === "string" && summary.trim()
        ? summary.trim()
        : undefined;

    let cleanFacts: Record<string, string> | undefined;
    if (facts && typeof facts === "object") {
      cleanFacts = {};
      for (const [k, v] of Object.entries(facts)) {
        if (!k || typeof k !== "string") continue;
        if (v === null || v === undefined) continue;
        const sv = String(v).trim();
        if (!sv) continue;
        cleanFacts[k] = sv;
      }
      if (!Object.keys(cleanFacts).length) cleanFacts = undefined;
    }

    if (!trimmedSummary && !cleanFacts) {
      // Nothing useful to report yet (e.g. data still loading).
      return;
    }

    const search = searchParams?.toString() || "";
    const route = search ? `${pathname}?${search}` : pathname;
    const { pageLabel, entityIds } = deriveContext(pathname);

    const fingerprint = JSON.stringify({
      route,
      summary: trimmedSummary || null,
      facts: cleanFacts || null,
    });
    if (fingerprint === lastSentRef.current) return;
    lastSentRef.current = fingerprint;

    void recordAiLiveFollowContext({
      route,
      pageLabel,
      entityIds: Object.keys(entityIds).length ? entityIds : undefined,
      summary: trimmedSummary,
      facts: cleanFacts,
    });
  }, [enabled, hydrated, pathname, searchParams, summary, facts]);
}

export default useReportAiContext;
