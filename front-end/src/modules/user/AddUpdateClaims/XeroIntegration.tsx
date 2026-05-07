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
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!paymentClaimId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apolloClient.query({
          query: GET_XERO_INVOICE_FOR_CLAIM,
          variables: { payment_claim_id: paymentClaimId },
          fetchPolicy: "no-cache",
        });
        if (cancelled) return;
        const payload = data?.getXeroInvoiceForClaim;
        if (payload?.status === "SUCCESS" && payload?.data) {
          setMeta(payload.data);
        } else {
          setMeta(null);
        }
      } catch (e) {
        if (!cancelled) setMeta(null);
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

  // Hide the expander entirely when there is no Xero invoice/bill linked.
  if (!paymentClaimId || !loaded || !meta) return null;

  const sourceLabel = meta.mapped_status
    ? `${meta.mapped_status}${meta.mapped_status === "Manual" ? " (user-mapped)" : meta.mapped_status === "System" ? " (auto-created by PayTrade)" : " (auto-imported from Xero)"}`
    : "—";
  const voidedAtLabel = meta.void_date
    ? new Date(meta.void_date).toLocaleString()
    : null;

  return (
    <div className="pt_expandtable">
      <details open>
        <summary>Xero Integration</summary>
        <div style={{ padding: "12px 16px" }}>
          {meta.is_stale && voidedAtLabel && (
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
        </div>
      </details>
    </div>
  );
}
