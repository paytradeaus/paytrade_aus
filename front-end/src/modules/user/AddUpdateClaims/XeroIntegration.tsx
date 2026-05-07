import React, { useEffect, useState } from "react";
import { gql } from "@apollo/client";
import { apolloClient } from "@/network/apolloClient";
import { showErrorToast } from "@/components/Toaster";

const GET_XERO_INVOICE_FOR_CLAIM = gql`
  query GetXeroInvoiceForClaim($payment_claim_id: Float!) {
    getXeroInvoiceForClaim(payment_claim_id: $payment_claim_id) {
      status
      message
      data {
        invoice_id
        invoice_number
        type
        mapped_status
        current_xero_status
        deep_link_url
        has_cached_pdf
        last_fetched_at
        is_stale
        void_date
      }
    }
  }
`;

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
  error_text: string | null;
  created_on: string | null;
}

const GET_XERO_PDF_TOKEN = gql`
  query GetXeroInvoicePdfDownloadToken($payment_claim_id: Float!) {
    getXeroInvoicePdfDownloadToken(payment_claim_id: $payment_claim_id) {
      status
      message
    }
  }
`;

interface XeroInvoiceMeta {
  invoice_id: string;
  invoice_number?: string | null;
  type?: string | null;
  mapped_status?: string | null;
  current_xero_status?: string | null;
  deep_link_url?: string | null;
  has_cached_pdf?: boolean;
  last_fetched_at?: string | null;
  is_stale?: boolean;
  void_date?: string | null;
}

export default function XeroIntegration({
  paymentClaimId,
}: {
  paymentClaimId: number | null | undefined;
}) {
  const [loaded, setLoaded] = useState(false);
  const [meta, setMeta] = useState<XeroInvoiceMeta | null>(null);
  const [journals, setJournals] = useState<RetentionJournal[]>([]);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!paymentClaimId) return;
    let cancelled = false;
    (async () => {
      try {
        const [invRes, jnlRes] = await Promise.all([
          apolloClient.query({
            query: GET_XERO_INVOICE_FOR_CLAIM,
            variables: { payment_claim_id: paymentClaimId },
            fetchPolicy: "no-cache",
          }),
          apolloClient.query({
            query: GET_RETENTION_JOURNALS,
            variables: { payment_claim_id: paymentClaimId },
            fetchPolicy: "no-cache",
          }),
        ]);
        if (cancelled) return;
        const payload = invRes.data?.getXeroInvoiceForClaim;
        if (payload?.status === "SUCCESS" && payload?.data) {
          setMeta(payload.data);
        } else {
          setMeta(null);
        }
        const jnlPayload = jnlRes.data?.getXeroRetentionJournalsForClaim;
        if (jnlPayload?.status === "SUCCESS" && Array.isArray(jnlPayload?.data)) {
          setJournals(jnlPayload.data);
        } else {
          setJournals([]);
        }
      } catch (e) {
        if (!cancelled) {
          setMeta(null);
          setJournals([]);
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paymentClaimId]);

  const handleDownload = async () => {
    if (!paymentClaimId) return;
    try {
      setDownloading(true);
      const { data } = await apolloClient.query({
        query: GET_XERO_PDF_TOKEN,
        variables: { payment_claim_id: paymentClaimId },
        fetchPolicy: "no-cache",
      });
      const tokenResp = data?.getXeroInvoicePdfDownloadToken;
      if (tokenResp?.status !== "SUCCESS" || !tokenResp?.message) {
        showErrorToast(tokenResp?.message || "Could not get download token");
        return;
      }
      const token = tokenResp.message;
      const resp = await fetch("/files/xeroPdf", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        showErrorToast(`Failed to download Xero PDF (HTTP ${resp.status})`);
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const fileName = `Xero-${meta?.invoice_number || meta?.invoice_id || paymentClaimId}.pdf`;
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      showErrorToast(e?.message || "Failed to download Xero PDF");
    } finally {
      setDownloading(false);
    }
  };

  // Hide the expander entirely when there is no Xero invoice/bill linked
  // AND no retention journals to display.
  if (!paymentClaimId || !loaded || (!meta && journals.length === 0)) return null;

  const sourceLabel = meta?.mapped_status
    ? `${meta.mapped_status}${meta.mapped_status === "Manual" ? " (user-mapped)" : meta.mapped_status === "System" ? " (auto-created by PayTrade)" : " (auto-imported from Xero)"}`
    : "—";
  const voidedAtLabel = meta?.void_date
    ? new Date(meta.void_date).toLocaleString()
    : null;

  return (
    <div className="pt_expandtable">
      <details open>
        <summary>Xero Integration</summary>
        <div style={{ padding: "12px 16px" }}>
          {meta && meta.is_stale && voidedAtLabel && (
            <div
              style={{
                background: "#fff3cd",
                border: "1px solid #ffeeba",
                color: "#856404",
                padding: "8px 12px",
                borderRadius: 4,
                marginBottom: 12,
              }}
            >
              This invoice/bill was voided or deleted in Xero. The cached PDF
              shown here is <strong>as at {voidedAtLabel}</strong> and is kept
              for audit purposes.
            </div>
          )}
          {meta && (
          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", rowGap: 8, columnGap: 12 }}>
            <div>
              <strong>Invoice #:</strong>
            </div>
            <div>{meta.invoice_number || "—"}</div>

            <div>
              <strong>Type:</strong>
            </div>
            <div>{meta.type === "ACCREC" ? "Sales invoice" : meta.type === "ACCPAY" ? "Bill" : meta.type || "—"}</div>

            <div>
              <strong>Mapping source:</strong>
            </div>
            <div>{sourceLabel}</div>

            <div>
              <strong>Xero status:</strong>
            </div>
            <div>
              {meta.current_xero_status || "—"}
              {meta.is_stale && (
                <span
                  style={{
                    marginLeft: 8,
                    padding: "2px 6px",
                    background: "#ffe5e5",
                    color: "#a00",
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  Stale
                </span>
              )}
            </div>

            {meta.last_fetched_at && (
              <>
                <div>
                  <strong>PDF cached:</strong>
                </div>
                <div>{new Date(meta.last_fetched_at).toLocaleString()}</div>
              </>
            )}

            <div style={{ gridColumn: "1 / span 2", display: "flex", gap: 12, marginTop: 8 }}>
              {meta.deep_link_url && (
                <a
                  href={meta.deep_link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pt_btn"
                >
                  Open in Xero
                </a>
              )}
              {meta.has_cached_pdf && (
                <button
                  type="button"
                  className="pt_btn"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? "Downloading…" : "Download Xero PDF"}
                </button>
              )}
            </div>
          </div>
          )}
          {journals.length > 0 && renderRetentionJournals(journals)}
        </div>
      </details>
    </div>
  );
}

function renderRetentionJournals(journals: RetentionJournal[]) {
  return (
    <div style={{ marginTop: 16, borderTop: "1px solid #eee", paddingTop: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>
        Retention GST gross-up journals
      </div>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
        PayTrade posts a balanced 2-line Manual Journal in Xero for the GST
        portion of retention so your books reconcile to the gross retention
        figure.
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f7f7f7", textAlign: "left" }}>
            <th style={{ padding: "6px 8px" }}>Type</th>
            <th style={{ padding: "6px 8px" }}>Status</th>
            <th style={{ padding: "6px 8px", textAlign: "right" }}>
              Retention ex-GST
            </th>
            <th style={{ padding: "6px 8px", textAlign: "right" }}>GST</th>
            <th style={{ padding: "6px 8px" }}>Tax type</th>
            <th style={{ padding: "6px 8px" }}>Source</th>
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
                  {j.status || "—"}
                </span>
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
              <td style={{ padding: "6px 8px" }}>{j.resolved_tax_type || "—"}</td>
              <td style={{ padding: "6px 8px" }}>{j.resolution_source || "—"}</td>
              <td style={{ padding: "6px 8px" }}>
                {j.created_on ? new Date(j.created_on).toLocaleString() : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
