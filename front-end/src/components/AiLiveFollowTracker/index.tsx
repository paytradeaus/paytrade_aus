"use client";
import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { RootState, useAppSelector } from "@/redux/store";
import { recordAiLiveFollowContext } from "@/network/uiPreferences";

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

export default function AiLiveFollowTracker() {
  const enabled = useAppSelector(
    (s: RootState) => s.uiPreferences.aiLiveFollowEnabled,
  );
  const hydrated = useAppSelector((s: RootState) => s.uiPreferences.hydrated);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastSentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    // Privacy: do nothing — not even derive context — when the flag is off.
    if (!enabled) {
      lastSentRef.current = null;
      return;
    }
    if (!pathname) return;

    const search = searchParams?.toString() || "";
    const route = search ? `${pathname}?${search}` : pathname;
    if (route === lastSentRef.current) return;
    lastSentRef.current = route;

    const { pageLabel, entityIds } = deriveContext(pathname);
    void recordAiLiveFollowContext({
      route,
      pageLabel,
      entityIds: Object.keys(entityIds).length ? entityIds : undefined,
    });
  }, [enabled, hydrated, pathname, searchParams]);

  return null;
}
