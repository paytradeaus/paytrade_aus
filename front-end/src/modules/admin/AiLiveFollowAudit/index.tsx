"use client";
// Admin audit list of users with the "Allow AI live follow"
// pilot flag enabled. Read-only; deliberately minimal — the pilot is
// internal-only, so we just need a quick list for the admin team.
import { useEffect, useState } from "react";
import { fetchAiLiveFollowAudit } from "@/network/uiPreferences";

interface AuditRow {
  user_id: number;
  email_id: string;
  first_name?: string;
  last_name?: string;
  ai_live_follow_enabled_at?: string;
}

export default function AiLiveFollowAudit() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const data = await fetchAiLiveFollowAudit();
      if (!cancelled) {
        setRows(data || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container-fluid">
      <div className="pt_card" style={{ padding: "var(--space-m)" }}>
        <h3 style={{ marginTop: 0, color: "var(--ocean)" }}>
          AI Live Follow — Audit
        </h3>
        <p style={{ color: "var(--cave-lighter)", marginTop: 4 }}>
          Users who currently have the &quot;Allow AI live follow&quot; pilot
          flag enabled. Toggling this flag on requires the temporary access
          password issued to pilot participants.
        </p>

        {loading ? (
          <p>
            <i className="fa-light fa-spinner-third fa-spin"></i> Loading…
          </p>
        ) : rows.length === 0 ? (
          <p style={{ marginTop: "var(--space-m)" }}>
            No users currently have AI live follow enabled.
          </p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: "var(--space-s)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left" }}>
                  <th style={th}>User ID</th>
                  <th style={th}>Name</th>
                  <th style={th}>Email</th>
                  <th style={th}>Enabled at (UTC)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.user_id}>
                    <td style={td}>{r.user_id}</td>
                    <td style={td}>
                      {[r.first_name, r.last_name].filter(Boolean).join(" ") ||
                        "—"}
                    </td>
                    <td style={td}>{r.email_id}</td>
                    <td style={td}>
                      {r.ai_live_follow_enabled_at
                        ? new Date(r.ai_live_follow_enabled_at).toISOString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid var(--shade-light)",
  fontSize: "var(--step--1)",
  color: "var(--cave)",
  fontWeight: 600,
};
const td: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid var(--shade-light)",
  fontSize: "var(--step--1)",
  color: "var(--cave)",
};
