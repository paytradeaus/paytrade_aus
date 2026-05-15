import { gql } from "@apollo/client";
import { client } from "@/app/api/adminApi/adminApi";
import { showErrorToast } from "@/components/Toaster";

export interface UiPreferencesPayload {
  navCollapsed: boolean;
  aiPanelState: "open" | "rail" | "hidden";
  aiPanelWidth: number;
  aiLiveFollowEnabled: boolean;
  aiLiveFollowEnabledAt: string | null;
}

const UI_PREFS_FIELDS = `
  navCollapsed
  aiPanelState
  aiPanelWidth
  aiLiveFollowEnabled
  aiLiveFollowEnabledAt
`;

export async function fetchUiPreferences(): Promise<UiPreferencesPayload | null> {
  try {
    const res = await client.query({
      query: gql`
        query GetUiPreferences {
          getUiPreferences {
            status
            message
            data { ${UI_PREFS_FIELDS} }
          }
        }
      `,
      fetchPolicy: "no-cache",
    });
    if (res?.data?.getUiPreferences?.status === "SUCCESS") {
      return res.data.getUiPreferences.data || null;
    }
    return null;
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.warn("fetchUiPreferences failed:", err?.message || err);
    return null;
  }
}

export async function persistUiPreferences(input: {
  navCollapsed?: boolean;
  aiPanelState?: "open" | "rail" | "hidden";
  aiPanelWidth?: number;
}): Promise<UiPreferencesPayload | null> {
  try {
    const res = await client.mutate({
      mutation: gql`
        mutation UpdateUiPreferences($input: UpdateUiPreferencesInput!) {
          updateUiPreferences(input: $input) {
            status
            message
            data { ${UI_PREFS_FIELDS} }
          }
        }
      `,
      variables: { input },
    });
    if (res?.data?.updateUiPreferences?.status === "SUCCESS") {
      return res.data.updateUiPreferences.data || null;
    }
    return null;
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.warn("persistUiPreferences failed:", err?.message || err);
    return null;
  }
}

export async function setAiLiveFollow(
  enabled: boolean,
  password?: string
): Promise<{ ok: boolean; message: string; data?: UiPreferencesPayload | null }> {
  try {
    const res = await client.mutate({
      mutation: gql`
        mutation SetAiLiveFollow($enabled: Boolean!, $password: String) {
          setAiLiveFollow(enabled: $enabled, password: $password) {
            status
            message
            data { ${UI_PREFS_FIELDS} }
          }
        }
      `,
      variables: { enabled, password },
    });
    const payload = res?.data?.setAiLiveFollow;
    if (payload?.status === "SUCCESS") {
      return { ok: true, message: payload.message, data: payload.data };
    }
    return { ok: false, message: payload?.message || "Unable to update setting" };
  } catch (err: any) {
    showErrorToast(err?.message || "Unable to update setting");
    return { ok: false, message: err?.message || "Unable to update setting" };
  }
}

export async function recordAiLiveFollowContext(input: {
  route: string;
  pageLabel?: string;
  entityIds?: Record<string, string>;
}): Promise<{ status: string; message?: string; recordedRoute?: string } | null> {
  try {
    const res = await client.mutate({
      mutation: gql`
        mutation RecordAiLiveFollowContext($input: RecordAiLiveFollowContextInput!) {
          recordAiLiveFollowContext(input: $input) {
            status
            message
            recordedRoute
          }
        }
      `,
      variables: { input },
      fetchPolicy: "no-cache",
    });
    return res?.data?.recordAiLiveFollowContext || null;
  } catch (err: any) {
    // Best-effort tracker — never surface to the user.
    // eslint-disable-next-line no-console
    console.warn("recordAiLiveFollowContext failed:", err?.message || err);
    return null;
  }
}

export async function fetchAiLiveFollowAudit(): Promise<
  Array<{
    user_id: number;
    email_id: string;
    first_name?: string;
    last_name?: string;
    ai_live_follow_enabled_at?: string;
  }>
> {
  try {
    const res = await client.query({
      query: gql`
        query ListAiLiveFollowUsers {
          listAiLiveFollowUsers {
            status
            message
            data {
              user_id
              email_id
              first_name
              last_name
              ai_live_follow_enabled_at
            }
          }
        }
      `,
      fetchPolicy: "no-cache",
    });
    if (res?.data?.listAiLiveFollowUsers?.status === "SUCCESS") {
      return res.data.listAiLiveFollowUsers.data || [];
    }
    return [];
  } catch (err: any) {
    showErrorToast(err?.message || "Unable to load audit list");
    return [];
  }
}
