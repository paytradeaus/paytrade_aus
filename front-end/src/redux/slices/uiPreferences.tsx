import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type AiPanelState = "open" | "rail" | "hidden";

export interface UiPreferencesState {
  navCollapsed: boolean;
  aiPanelState: AiPanelState;
  aiPanelWidth: number;
  aiLiveFollowEnabled: boolean;
  aiLiveFollowEnabledAt: string | null;
  aiLiveFollowPageLabel: string | null;
  hydrated: boolean;
}

export const AI_PANEL_MIN_WIDTH = 280;
export const AI_PANEL_MAX_WIDTH = 640;
export const AI_PANEL_DEFAULT_WIDTH = 360;
const STORAGE_KEY = "pt_ui_preferences_v1";

function readLocal(): Partial<UiPreferencesState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<UiPreferencesState>;
  } catch {
    return {};
  }
}

function writeLocal(state: UiPreferencesState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        navCollapsed: state.navCollapsed,
        aiPanelState: state.aiPanelState,
        aiPanelWidth: state.aiPanelWidth,
      })
    );
  } catch {
    // ignore
  }
}

const initialState: UiPreferencesState = (() => {
  const local = readLocal();
  return {
    navCollapsed: !!local.navCollapsed,
    aiPanelState:
      local.aiPanelState === "rail" || local.aiPanelState === "hidden"
        ? (local.aiPanelState as AiPanelState)
        : "open",
    aiPanelWidth:
      typeof local.aiPanelWidth === "number" && local.aiPanelWidth > 0
        ? local.aiPanelWidth
        : AI_PANEL_DEFAULT_WIDTH,
    aiLiveFollowEnabled: false,
    aiLiveFollowEnabledAt: null,
    aiLiveFollowPageLabel: null,
    hydrated: false,
  };
})();

const slice = createSlice({
  name: "uiPreferences",
  initialState,
  reducers: {
    hydrateUiPreferences: (
      state,
      action: PayloadAction<Partial<UiPreferencesState>>
    ) => {
      const p = action.payload || {};
      if (typeof p.navCollapsed === "boolean") state.navCollapsed = p.navCollapsed;
      if (
        p.aiPanelState === "open" ||
        p.aiPanelState === "rail" ||
        p.aiPanelState === "hidden"
      ) {
        state.aiPanelState = p.aiPanelState;
      }
      if (typeof p.aiPanelWidth === "number" && p.aiPanelWidth > 0) {
        state.aiPanelWidth = p.aiPanelWidth;
      }
      if (typeof p.aiLiveFollowEnabled === "boolean") {
        state.aiLiveFollowEnabled = p.aiLiveFollowEnabled;
      }
      if (p.aiLiveFollowEnabledAt !== undefined) {
        state.aiLiveFollowEnabledAt = p.aiLiveFollowEnabledAt;
      }
      state.hydrated = true;
      writeLocal(state);
    },
    setNavCollapsed: (state, action: PayloadAction<boolean>) => {
      state.navCollapsed = action.payload;
      writeLocal(state);
    },
    setAiPanelState: (state, action: PayloadAction<AiPanelState>) => {
      state.aiPanelState = action.payload;
      writeLocal(state);
    },
    setAiPanelWidth: (state, action: PayloadAction<number>) => {
      const w = Math.max(
        AI_PANEL_MIN_WIDTH,
        Math.min(AI_PANEL_MAX_WIDTH, Math.round(action.payload))
      );
      state.aiPanelWidth = w;
      writeLocal(state);
    },
    setAiLiveFollow: (
      state,
      action: PayloadAction<{ enabled: boolean; enabledAt?: string | null }>
    ) => {
      state.aiLiveFollowEnabled = action.payload.enabled;
      if (action.payload.enabledAt !== undefined) {
        state.aiLiveFollowEnabledAt = action.payload.enabledAt;
      }
      if (!action.payload.enabled) {
        state.aiLiveFollowPageLabel = null;
      }
    },
    setAiLiveFollowPageLabel: (
      state,
      action: PayloadAction<string | null>
    ) => {
      state.aiLiveFollowPageLabel = action.payload;
    },
  },
});

export const {
  hydrateUiPreferences,
  setNavCollapsed,
  setAiPanelState,
  setAiPanelWidth,
  setAiLiveFollow,
  setAiLiveFollowPageLabel,
} = slice.actions;

export default slice.reducer;
