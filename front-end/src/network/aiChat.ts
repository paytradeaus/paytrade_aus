/**
 * Task #162 — Read-only AI Chat Agent client.
 *
 * Talks to `POST /api/ai/chat` (Server-Sent Events stream),
 * `POST /api/ai/runs/:id/stop`, and `GET /api/ai/events` (SSE).
 *
 * The OpenAI key is never sent to the browser — the backend owns
 * all model calls and tool execution. This module only marshals
 * messages, parses SSE frames, and surfaces a small typed event
 * stream to the UI.
 */

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : "";
}

function getAccessToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("accessToken") || "";
}

function getActiveCompanyId(): number | null {
  if (typeof window === "undefined") return null;
  const raw =
    localStorage.getItem("companyId") ||
    getCookie("companyId") ||
    localStorage.getItem("UserCompanyId") ||
    "";
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * REST base URL.
 *
 * In the browser, requests stay relative — Next.js' rewrites/proxy
 * route them to the backend on the same origin. For SSR or test
 * environments, we derive a fully-qualified URL from the GraphQL
 * env var by stripping `/graphql`.
 */
function getApiBase(): string {
  if (typeof window !== "undefined") return "";
  const gql = process.env.NEXT_PUBLIC_GRAPHQL_URI || "";
  return gql.replace(/\/graphql\/?$/, "");
}

export type AiChatRole = "user" | "assistant";

export interface AiChatTurn {
  role: AiChatRole;
  content: string;
}

export interface AiChatRunSummary {
  amountChargedUsd: number;
  multiplier: number;
  rawCostUsd: number;
  totalTokens: number;
  toolCallCount: number;
  durationMs: number;
  model: string | null;
}

export type AiChatStreamEvent =
  | { type: "run_started"; runId: string; conversationId: string }
  | { type: "text_delta"; text: string }
  | {
      type: "tool_call_started";
      callId: string;
      toolName: string;
      arguments: any;
    }
  | {
      type: "tool_call_completed";
      callId: string;
      toolName: string;
      ok: boolean;
      result: any;
      errorMessage?: string;
    }
  | {
      type: "run_completed";
      runId: string;
      status: "completed" | "stopped" | "failed";
      summary: AiChatRunSummary;
      errorMessage?: string;
    };

export interface SendChatOptions {
  message: string;
  history?: AiChatTurn[];
  conversationId?: string | null;
  pageContext?: { path?: string; entity?: string; entityId?: string | number };
  signal?: AbortSignal;
  onEvent: (event: AiChatStreamEvent) => void;
}

/** Parses an SSE byte stream and dispatches events. */
async function pumpSse(
  res: Response,
  onEvent: (event: AiChatStreamEvent) => void,
): Promise<void> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      const lines = frame.split("\n");
      let event = "message";
      const dataLines: string[] = [];
      for (const line of lines) {
        if (line.startsWith(":")) continue; // comment/heartbeat
        if (line.startsWith("event:")) {
          event = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trimStart());
        }
      }
      if (!dataLines.length) continue;
      const dataStr = dataLines.join("\n");
      try {
        const parsed = JSON.parse(dataStr);
        // Always honour the explicit `event:` field as the type so the
        // server can re-use it across small additions.
        onEvent({ ...parsed, type: parsed.type || event } as AiChatStreamEvent);
      } catch {
        // Bad frame — drop silently; the run_completed event arriving
        // later is what matters for state transitions.
      }
    }
  }
}

export async function sendAiChatStreaming(
  opts: SendChatOptions,
): Promise<void> {
  const token = getAccessToken();
  const companyId = getActiveCompanyId();
  if (!token) {
    opts.onEvent({
      type: "run_completed",
      runId: "",
      status: "failed",
      summary: emptySummary(),
      errorMessage: "Please log in.",
    });
    return;
  }
  if (!companyId) {
    opts.onEvent({
      type: "run_completed",
      runId: "",
      status: "failed",
      summary: emptySummary(),
      errorMessage: "Please pick a business profile first.",
    });
    return;
  }

  let res: Response;
  try {
    res = await fetch(`${getApiBase()}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        companyId: String(companyId),
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        message: opts.message,
        companyId,
        conversationId: opts.conversationId ?? null,
        history: opts.history ?? [],
        pageContext: opts.pageContext,
      }),
      signal: opts.signal,
    });
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      opts.onEvent({
        type: "run_completed",
        runId: "",
        status: "failed",
        summary: emptySummary(),
        errorMessage: err?.message || "Network error",
      });
    }
    return;
  }

  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      detail = "";
    }
    opts.onEvent({
      type: "run_completed",
      runId: "",
      status: "failed",
      summary: emptySummary(),
      errorMessage:
        res.status === 403
          ? "You're not allowed to chat for this business."
          : `Chat failed (HTTP ${res.status}). ${detail}`.trim(),
    });
    return;
  }

  try {
    await pumpSse(res, opts.onEvent);
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      opts.onEvent({
        type: "run_completed",
        runId: "",
        status: "failed",
        summary: emptySummary(),
        errorMessage: err?.message || "Stream interrupted",
      });
    }
  }
}

export async function stopAiChatRun(runId: string): Promise<boolean> {
  if (!runId) return false;
  const token = getAccessToken();
  if (!token) return false;
  try {
    const res = await fetch(`${getApiBase()}/api/ai/runs/${runId}/stop`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const json = await res.json().catch(() => null);
    return !!json?.stopped;
  } catch {
    return false;
  }
}

export interface AiStatusSnapshotIssueGroup {
  category: string;
  total: number;
  critical: number;
  warning: number;
  info: number;
}

export interface AiStatusSnapshotResponse {
  generatedAt?: string;
  summary?: {
    total: number;
    critical: number;
    warning: number;
    info: number;
    byCategory?: AiStatusSnapshotIssueGroup[];
  };
}

/** Fetch the read-only system status snapshot via REST. */
export async function fetchAiStatusSnapshot(
  companyId?: number,
): Promise<AiStatusSnapshotResponse | null> {
  const token = getAccessToken();
  const cid = companyId ?? getActiveCompanyId();
  if (!token || !cid) return null;
  try {
    const res = await fetch(
      `${getApiBase()}/api/ai/status-snapshot?company_id=${cid}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          companyId: String(cid),
        },
      },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export type AiPushEvent =
  | {
      type: "navigation_request";
      runId: string;
      route: string;
      reason?: string;
      requestedAt: string;
    }
  | {
      type: "run_started";
      runId: string;
      conversationId: string;
      requestedAt: string;
    }
  | {
      type: "run_completed";
      runId: string;
      status: "completed" | "stopped" | "failed";
      amountChargedUsd: number;
      multiplier: number;
      totalTokens: number;
      requestedAt: string;
    };

/** Open the long-lived push channel. Returns a closer. */
export function openAiEventStream(
  onEvent: (event: AiPushEvent) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const token = getAccessToken();
  if (!token) return () => {};
  const url = `${getApiBase()}/api/ai/events?token=${encodeURIComponent(token)}`;
  let es: EventSource | null;
  try {
    es = new EventSource(url);
  } catch {
    return () => {};
  }
  const handler = (kind: AiPushEvent["type"]) => (e: MessageEvent) => {
    try {
      const parsed = JSON.parse(e.data);
      onEvent({ ...parsed, type: parsed.type || kind } as AiPushEvent);
    } catch {
      // ignore unparseable frame
    }
  };
  es.addEventListener("navigation_request", handler("navigation_request"));
  es.addEventListener("run_started", handler("run_started"));
  es.addEventListener("run_completed", handler("run_completed"));
  return () => {
    try {
      es?.close();
    } catch {
      // already closed
    }
  };
}

export interface AiConversationSummary {
  id: string;
  title: string;
  lastMessageAt: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: string;
  status?: string | null;
  pageContext?: {
    route?: string;
    pageLabel?: string;
    entity?: string;
    entityId?: string;
    entityIds?: Record<string, string>;
    companyId?: number;
    path?: string;
  } | null;
  runId?: string | null;
}

export interface AiConversationDetail {
  id: string;
  title: string;
  companyId: number | null;
  messages: AiConversationMessage[];
}

async function authedJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T | null> {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    if (init?.body) headers["Content-Type"] = "application/json";
    const res = await fetch(`${getApiBase()}${url}`, {
      ...init,
      headers: { ...headers, ...((init?.headers as Record<string, string>) || {}) },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function listAiConversations(
  companyId?: number | null,
): Promise<AiConversationSummary[]> {
  const cid = companyId ?? getActiveCompanyId();
  const qs = cid ? `?companyId=${cid}` : "";
  const json = await authedJson<{
    status: string;
    conversations: AiConversationSummary[];
  }>(`/api/ai/conversations${qs}`);
  if (json?.status === "SUCCESS") return json.conversations || [];
  return [];
}

export async function getAiConversation(
  id: string,
): Promise<AiConversationDetail | null> {
  const json = await authedJson<{
    status: string;
    conversation: { id: string; title: string; companyId: number | null };
    messages: AiConversationMessage[];
  }>(`/api/ai/conversations/${encodeURIComponent(id)}`);
  if (json?.status !== "SUCCESS") return null;
  return {
    id: json.conversation.id,
    title: json.conversation.title || "New chat",
    companyId: json.conversation.companyId,
    messages: json.messages || [],
  };
}

export async function renameAiConversation(
  id: string,
  title: string,
): Promise<{ id: string; title: string } | null> {
  const json = await authedJson<{
    status: string;
    conversation: { id: string; title: string };
  }>(`/api/ai/conversations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
  if (json?.status === "SUCCESS") return json.conversation;
  return null;
}

export async function deleteAiConversation(id: string): Promise<boolean> {
  const json = await authedJson<{ status: string; deleted: boolean }>(
    `/api/ai/conversations/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  return !!json?.deleted;
}

function emptySummary(): AiChatRunSummary {
  return {
    amountChargedUsd: 0,
    multiplier: 1,
    rawCostUsd: 0,
    totalTokens: 0,
    toolCallCount: 0,
    durationMs: 0,
    model: null,
  };
}
