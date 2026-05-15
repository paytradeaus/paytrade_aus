"use client";
import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { setAiLiveFollowPageLabel } from "@/redux/slices/uiPreferences";
import { recordAiLiveFollowContext } from "@/network/uiPreferences";
import { deriveContext } from "./deriveContext";

export default function AiLiveFollowTracker() {
  const dispatch = useAppDispatch();
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

  return null;
}
