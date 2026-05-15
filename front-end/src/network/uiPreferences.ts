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
  summary?: string;
  facts?: Record<string, string>;
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

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: string;
  status?: string | null;
}

const AI_CHAT_FIELDS = `
  id
  role
  content
  ts
  status
`;

export async function fetchAiChatHistory(): Promise<AiChatMessage[]> {
  try {
    const res = await client.query({
      query: gql`
        query GetAiChatHistory {
          getAiChatHistory {
            status
            message
            history { ${AI_CHAT_FIELDS} }
          }
        }
      `,
      fetchPolicy: "no-cache",
    });
    if (res?.data?.getAiChatHistory?.status === "SUCCESS") {
      return res.data.getAiChatHistory.history || [];
    }
    return [];
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.warn("fetchAiChatHistory failed:", err?.message || err);
    return [];
  }
}

export async function sendAiChatMessage(
  message: string
): Promise<{
  status: string;
  message?: string | null;
  history: AiChatMessage[];
  remainingQuota?: number | null;
}> {
  try {
    const res = await client.mutate({
      mutation: gql`
        mutation SendAiChatMessage($input: SendAiChatMessageInput!) {
          sendAiChatMessage(input: $input) {
            status
            message
            remainingQuota
            history { ${AI_CHAT_FIELDS} }
          }
        }
      `,
      variables: { input: { message } },
    });
    const payload = res?.data?.sendAiChatMessage;
    return {
      status: payload?.status || "ERROR",
      message: payload?.message,
      history: payload?.history || [],
      remainingQuota: payload?.remainingQuota,
    };
  } catch (err: any) {
    return {
      status: "ERROR",
      message: err?.message || "Unable to send message",
      history: [],
    };
  }
}

export interface StreamAiChatCallbacks {
  onDelta: (chunk: string) => void;
  onDone: (result: {
    status: string;
    message?: string | null;
    history: AiChatMessage[];
    remainingQuota?: number | null;
  }) => void;
  onError: (message: string) => void;
}

export async function streamAiChatMessage(
  message: string,
  cb: StreamAiChatCallbacks,
): Promise<void> {
  let token = "";
  if (typeof window !== "undefined") {
    token = localStorage.getItem("accessToken") || "";
  }
  let response: Response;
  try {
    response = await fetch("/ai-chat/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message }),
    });
  } catch (err: any) {
    cb.onError(err?.message || "Unable to send message");
    return;
  }

  if (!response.ok || !response.body) {
    cb.onError(`Request failed (${response.status})`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let doneEmitted = false;

  const handleEvent = (eventName: string, dataLine: string) => {
    let data: any = null;
    try {
      data = JSON.parse(dataLine);
    } catch {
      return;
    }
    if (eventName === "delta" && typeof data?.content === "string") {
      cb.onDelta(data.content);
    } else if (eventName === "done") {
      doneEmitted = true;
      cb.onDone({
        status: data?.status || "ERROR",
        message: data?.message || null,
        history: Array.isArray(data?.history) ? data.history : [],
        remainingQuota:
          typeof data?.remainingQuota === "number" ? data.remainingQuota : null,
      });
    } else if (eventName === "error") {
      cb.onError(data?.message || "Something went wrong.");
    }
  };

  const flushBlock = (block: string) => {
    let eventName = "message";
    const dataParts: string[] = [];
    block.split("\n").forEach((line) => {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataParts.push(line.slice(5).trim());
      }
    });
    if (dataParts.length > 0) {
      handleEvent(eventName, dataParts.join("\n"));
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (block.trim().length > 0) flushBlock(block);
      }
    }
    if (buffer.trim().length > 0) flushBlock(buffer);
    if (!doneEmitted) {
      cb.onError("Stream ended unexpectedly.");
    }
  } catch (err: any) {
    cb.onError(err?.message || "Stream interrupted");
  }
}

export async function clearAiChatHistory(): Promise<AiChatMessage[]> {
  try {
    const res = await client.mutate({
      mutation: gql`
        mutation ClearAiChatHistory {
          clearAiChatHistory {
            status
            message
            history { ${AI_CHAT_FIELDS} }
          }
        }
      `,
    });
    if (res?.data?.clearAiChatHistory?.status === "SUCCESS") {
      return res.data.clearAiChatHistory.history || [];
    }
    return [];
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.warn("clearAiChatHistory failed:", err?.message || err);
    return [];
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
