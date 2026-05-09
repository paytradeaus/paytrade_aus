import React, { useEffect, useState } from "react";
import { gql } from "@apollo/client";
import { apolloClient } from "@/network/apolloClient";

const GET_RETENTION_JOURNALS = gql`
  query GetXeroRetentionJournalsForClaim($payment_claim_id: Float!) {
    getXeroRetentionJournalsForClaim(payment_claim_id: $payment_claim_id) {
      status
      message
      data {
        id
        manual_journal_id
        kind
        status
        retention_ex_gst
        gst_amount
        resolved_tax_type
        resolution_source
        narration
        account_1_code
        account_2_code
        deep_link_url
        error_text
        created_on
      }
    }
  }
`;

interface RetentionJournal {
  id: string;
  manual_journal_id: string | null;
  kind: string | null;
  status: string | null;
  retention_ex_gst: number | null;
  gst_amount: number | null;
  resolved_tax_type: string | null;
  resolution_source: string | null;
  narration: string | null;
  account_1_code: string | null;
  account_2_code: string | null;
  deep_link_url: string | null;
  error_text: string | null;
  created_on: string | null;
}

export default function JournalEntries({
  paymentClaimId,
}: {
  paymentClaimId: number | null | undefined;
}) {
  const [loaded, setLoaded] = useState(false);
  const [journals, setJournals] = useState<RetentionJournal[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!paymentClaimId) {
        setLoaded(true);
        return;
      }
      try {
        const { data } = await apolloClient.query({
          query: GET_RETENTION_JOURNALS,
          variables: { payment_claim_id: paymentClaimId },
          fetchPolicy: "no-cache",
        });
        const payload = data?.getXeroRetentionJournalsForClaim;
        if (cancelled) return;
        if (payload?.status === "SUCCESS" && Array.isArray(payload?.data)) {
          setJournals(payload.data);
        } else {
          setJournals([]);
        }
      } catch {
        if (!cancelled) setJournals([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paymentClaimId]);

  if (!paymentClaimId || !loaded || journals.length === 0) return null;

  return (
    <div
      style={{
        marginTop: 16,
        borderTop: "1px solid #eee",
        paddingTop: 12,
        maxWidth: "100%",
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Journal entries</div>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
        Retention GST gross-up Manual Journals PayTrade has posted to Xero for
        this claim.
      </div>
      <div style={{ overflowX: "auto", maxWidth: "100%", minWidth: 0 }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead>
            <tr style={{ background: "#f7f7f7", textAlign: "left" }}>
              <th style={{ padding: "6px 8px" }}>Type</th>
              <th style={{ padding: "6px 8px" }}>Status</th>
              <th style={{ padding: "6px 8px" }}>Journal</th>
              <th style={{ padding: "6px 8px" }}>DR account</th>
              <th style={{ padding: "6px 8px" }}>CR account</th>
              <th style={{ padding: "6px 8px", textAlign: "right" }}>
                Retention ex-GST
              </th>
              <th style={{ padding: "6px 8px", textAlign: "right" }}>GST</th>
              <th style={{ padding: "6px 8px" }}>Tax type</th>
              <th style={{ padding: "6px 8px" }}>Posted</th>
            </tr>
          </thead>
          <tbody>
            {journals.map((j) => (
              <tr key={j.id} style={{ borderTop: "1px solid #eee" }}>
                <td style={{ padding: "6px 8px" }}>
                  {j.kind === "gross_up_reversal"
                    ? "Reversal (release)"
                    : "Gross-up (claim)"}
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontSize: 12,
                      background:
                        j.status === "POSTED"
                          ? "#e0f5e9"
                          : j.status === "FAILED"
                            ? "#ffe5e5"
                            : "#f0f0f0",
                      color:
                        j.status === "POSTED"
                          ? "#2a7a3a"
                          : j.status === "FAILED"
                            ? "#a00"
                            : "#555",
                    }}
                  >
                    {j.status === "DELETED" ? "Voided" : j.status || "—"}
                  </span>
                </td>
                <td style={{ padding: "6px 8px" }}>
                  {j.deep_link_url && j.manual_journal_id ? (
                    <a
                      href={j.deep_link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={j.manual_journal_id}
                    >
                      Open
                    </a>
                  ) : j.manual_journal_id ? (
                    <code style={{ fontSize: 11 }}>
                      {j.manual_journal_id.slice(0, 8)}…
                    </code>
                  ) : (
                    "—"
                  )}
                </td>
                <td style={{ padding: "6px 8px" }}>
                  {j.account_1_code || "—"}
                </td>
                <td style={{ padding: "6px 8px" }}>
                  {j.account_2_code || "—"}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>
                  {j.retention_ex_gst != null
                    ? `$${Number(j.retention_ex_gst).toFixed(2)}`
                    : "—"}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>
                  {j.gst_amount != null
                    ? `$${Number(j.gst_amount).toFixed(2)}`
                    : "—"}
                </td>
                <td style={{ padding: "6px 8px" }}>
                  {j.resolved_tax_type || "—"}
                </td>
                <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                  {j.created_on
                    ? new Date(j.created_on).toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {journals.some((j) => j.status === "FAILED" && j.error_text) && (
        <div style={{ marginTop: 8, color: "#a00", fontSize: 12 }}>
          {journals
            .filter((j) => j.status === "FAILED" && j.error_text)
            .map((j) => (
              <div key={`err-${j.id}`}>{j.error_text}</div>
            ))}
        </div>
      )}
    </div>
  );
}
