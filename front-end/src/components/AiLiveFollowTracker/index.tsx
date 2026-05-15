"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { setAiLiveFollowPageLabel } from "@/redux/slices/uiPreferences";
import { recordAiLiveFollowContext } from "@/network/uiPreferences";
import { openAiEventStream } from "@/network/aiChat";

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

function deriveContext(pathname: string): {
  pageLabel: string;
  entityIds: Record<string, string>;
} {
  const segments = pathname.split("/").filter(Boolean);
  const entityIds: Record<string, string> = {};
  const labelParts: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const isId = NUMERIC_RE.test(seg) || UUID_RE.test(seg);
    if (isId) {
      const parent = segments[i - 1];
      const key = (parent && ID_KEY_BY_PARENT[parent]) || `${parent || "id"}Id`;
      if (!entityIds[key]) entityIds[key] = seg;
      labelParts.push(seg);
    } else {
      labelParts.push(seg);
    }
  }

  return {
    pageLabel: labelParts.join(" / ") || "/",
    entityIds,
  };
}

/**
 * Privacy-respecting navigator: only allow routes inside the app's
 * own dashboard tree to avoid leaking the user off-site if a tool
 * call ever returned a malformed value.
 */
function isAllowedRoute(route: string): boolean {
  if (!route || typeof route !== "string") return false;
  if (!route.startsWith("/")) return false;
  if (route.startsWith("//")) return false;
  if (/[\r\n]/.test(route)) return false;
  return true;
}

export default function AiLiveFollowTracker() {
  const dispatch = useAppDispatch();
  const enabled = useAppSelector(
    (s: RootState) => s.uiPreferences.aiLiveFollowEnabled,
  );
  const hydrated = useAppSelector((s: RootState) => s.uiPreferences.hydrated);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const lastSentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    // Privacy: do nothing — not even derive context — when the flag is off.
    if (!enabled) {
      lastSentRef.current = null;
      dispatch(setAiLiveFollowPageLabel(null));
      return;
    }
    if (!pathname) return;

    const search = searchParams?.toString() || "";
    const route = search ? `${pathname}?${search}` : pathname;
    if (route === lastSentRef.current) return;
    lastSentRef.current = route;

    const { pageLabel, entityIds } = deriveContext(pathname);
    dispatch(setAiLiveFollowPageLabel(pageLabel));
    void recordAiLiveFollowContext({
      route,
      pageLabel,
      entityIds: Object.keys(entityIds).length ? entityIds : undefined,
    });
  }, [dispatch, enabled, hydrated, pathname, searchParams]);

  // Subscribe to push events. Navigation requests are honoured only
  // when live-follow is on; otherwise the AiPanel surfaces them as
  // suggestions and the user can click through manually.
  useEffect(() => {
    if (!hydrated || !enabled) return;
    const close = openAiEventStream((event) => {
      if (event.type !== "navigation_request") return;
      if (!isAllowedRoute(event.route)) return;
      try {
        router.push(event.route);
      } catch {
        // router not ready yet — ignore; user can re-prompt
      }
    });
    return close;
  }, [hydrated, enabled, router]);

  return null;
}
