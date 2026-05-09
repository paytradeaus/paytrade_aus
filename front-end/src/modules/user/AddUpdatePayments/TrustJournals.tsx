import React, { useEffect, useState } from "react";
import { gql } from "@apollo/client";
import { apolloClient } from "@/network/apolloClient";

const GET_TRUST_JOURNALS = gql`
  query GetTrustJournalsForClaim($payment_claim_id: Float!) {
    getTrustJournalsForClaim(payment_claim_id: $payment_claim_id) {
      status
      message
      data {
        id
        journal_number
        journal_date
        account_name
        process_label
        audit_kind
        payment_id_ref
        debit_amount
        credit_amount
      }
    }
  }
`;

interface TrustJournalRow {
  id: string;
  journal_number: number;
  journal_date: string | null;
  account_name: string | null;
  process_label: string | null;
  audit_kind: string | null;
  payment_id_ref: number | null;
  debit_amount: string | null;
  credit_amount: string | null;
}

function fmtAmount(v: string | null): string {
  if (v == null) return "-";
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return "-";
  return `$ ${n.toFixed(2)}`;
}

function fmtDate(v: string | null): string {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

export default function TrustJournals({
  paymentClaimId,
}: {
  paymentClaimId: number | null | undefined;
}) {
  const [loaded, setLoaded] = useState(false);
  const [rows, setRows] = useState<TrustJournalRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setRows([]);
    (async () => {
      if (!paymentClaimId) {
        setLoaded(true);
        return;
      }
      try {
        const { data } = await apolloClient.query({
          query: GET_TRUST_JOURNALS,
          variables: { payment_claim_id: paymentClaimId },
          fetchPolicy: "no-cache",
        });
        const payload = data?.getTrustJournalsForClaim;
        if (cancelled) return;
        if (payload?.status === "SUCCESS" && Array.isArray(payload?.data)) {
          setRows(payload.data);
        } else {
          setRows([]);
        }
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paymentClaimId]);

  if (!paymentClaimId || !loaded || rows.length === 0) return null;

  const cap = 100;
  const showingCapNote = rows.length >= cap;

  return (
    <div style={{ marginTop: 16, borderTop: "1px solid #eee", paddingTop: 12 }}>
      <h4 style={{ color: "var(--wind)" }}>Trust journals</h4>
      <div
        style={{ fontSize: 12, marginBottom: 8, color: "var(--wind)" }}
      >
        Trust account journal entries PayTrade has posted for this claim and
        any payments under it.
        {showingCapNote
          ? ` Showing the most recent ${cap} entries — older entries may exist on the account ledger.`
          : ""}
      </div>
      <div className="table-wrapper" style={{ overflowX: "auto", maxWidth: "100%" }}>
        <div className="pt_table pt_formtable">
          <table className="dataTable compact stripe nowrap hover order-column">
            <thead>
              <tr>
                <th>Date</th>
                <th>Journal #</th>
                <th>Account</th>
                <th>Process</th>
                <th>Reference</th>
                <th style={{ textAlign: "right" }}>Debit</th>
                <th style={{ textAlign: "right" }}>Credit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.journal_date)}</td>
                  <td>{r.journal_number || "-"}</td>
                  <td>{r.account_name || "-"}</td>
                  <td>{r.process_label || "-"}</td>
                  <td>
                    {r.audit_kind === "claim"
                      ? "Claim"
                      : r.audit_kind === "payment" && r.payment_id_ref
                      ? `Payment #${r.payment_id_ref}`
                      : "-"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {fmtAmount(r.debit_amount)}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {fmtAmount(r.credit_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <br />
    </div>
  );
}
