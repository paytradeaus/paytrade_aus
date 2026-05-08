import React, { useEffect, useState } from "react";
import { gql } from "@apollo/client";
import { apolloClient } from "@/network/apolloClient";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";

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
        account_1_code
        account_2_code
        deep_link_url
        error_text
        created_on
      }
    }
  }
`;

const RETRY_RETENTION_JOURNAL = gql`
  mutation RetryRetentionGrossUpJournal($payment_claim_id: Float!) {
    retryRetentionGrossUpJournal(payment_claim_id: $payment_claim_id) {
      status
      message
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
  const [retrying, setRetrying] = useState(false);

  const fetchAll = async () => {
    if (!paymentClaimId) return;
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
      setMeta(null);
      setJournals([]);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchAll();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleRetry = async () => {
    if (!paymentClaimId) return;
    try {
      setRetrying(true);
      const { data } = await apolloClient.mutate({
        mutation: RETRY_RETENTION_JOURNAL,
        variables: { payment_claim_id: paymentClaimId },
      });
      const resp = data?.retryRetentionGrossUpJournal;
      if (resp?.status === "SUCCESS") {
        showSuccessToast(resp?.message || "Retry triggered");
        await fetchAll();
      } else {
        showErrorToast(resp?.message || "Retry failed");
      }
    } catch (e: any) {
      showErrorToast(e?.message || "Retry failed");
    } finally {
      setRetrying(false);
    }
  };

  if (!paymentClaimId || !loaded || (!meta && journals.length === 0))
    return null;

  const sourceLabel = meta?.mapped_status
    ? `${meta.mapped_status}${meta.mapped_status === "Manual" ? " (user-mapped)" : meta.mapped_status === "System" ? " (auto-created by PayTrade)" : " (auto-imported from Xero)"}`
    : "—";
  const voidedAtLabel = meta?.void_date
    ? new Date(meta.void_date).toLocaleString()
    : null;

  // The "latest" journal for retry is the newest row; retry is offered when
  // its status is FAILED.
  const latestFailed =
    journals.length > 0 && journals[0]?.status === "FAILED" ? journals[0] : null;

  return (
    <div className="pt_expandtable pt_xero_card">
      <details>
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr",
                rowGap: 8,
                columnGap: 12,
              }}
            >
              <div>
                <strong>Invoice #:</strong>
              </div>
              <div>{meta.invoice_number || "—"}</div>

              <div>
                <strong>Type:</strong>
              </div>
              <div>
                {meta.type === "ACCREC"
                  ? "Sales invoice"
                  : meta.type === "ACCPAY"
                    ? "Bill"
                    : meta.type || "—"}
              </div>

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

              <div
                style={{
                  gridColumn: "1 / span 2",
                  display: "flex",
                  gap: 12,
                  marginTop: 8,
                }}
              >
                {meta.deep_link_url && (
                  <a
                    href={meta.deep_link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pt_btn_xero"
                  >
                    Open in Xero
                  </a>
                )}
                <button
                  type="button"
                  className="pt_btn_xero"
                  onClick={handleDownload}
                  disabled={downloading}
                  title={
                    meta.has_cached_pdf
                      ? "Download the cached Xero PDF"
                      : "PDF not yet cached — will fetch from Xero on demand"
                  }
                >
                  {downloading ? "Downloading…" : "Download Xero PDF"}
                </button>
              </div>
            </div>
          )}
          {journals.length > 0 &&
            renderRetentionJournals(journals, latestFailed, retrying, handleRetry)}
        </div>
      </details>
    </div>
  );
}

function renderRetentionJournals(
  journals: RetentionJournal[],
  latestFailed: RetentionJournal | null,
  retrying: boolean,
  onRetry: () => void,
) {
  return (
    <div style={{ marginTop: 16, borderTop: "1px solid #eee", paddingTop: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div style={{ fontWeight: 600 }}>Retention GST gross-up journals</div>
        {latestFailed && (
          <button
            type="button"
            className="pt_btn"
            onClick={onRetry}
            disabled={retrying}
            title="Re-attempt posting the gross-up Manual Journal in Xero"
          >
            {retrying ? "Retrying…" : "Retry latest"}
          </button>
        )}
      </div>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
        PayTrade posts a balanced 2-line Manual Journal in Xero for the GST
        portion of retention so your books reconcile to the gross retention
        figure.
      </div>
      <div style={{ overflowX: "auto" }}>
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
              <th style={{ padding: "6px 8px" }}>Source</th>
              <th style={{ padding: "6px 8px" }}>Narration</th>
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
                <td style={{ padding: "6px 8px" }}>
                  {j.resolution_source || "—"}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    maxWidth: 280,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={j.narration || ""}
                >
                  {j.narration || "—"}
                </td>
                <td style={{ padding: "6px 8px" }}>
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
