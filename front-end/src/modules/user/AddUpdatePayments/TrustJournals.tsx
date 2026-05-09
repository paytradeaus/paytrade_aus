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
      <h4>Trust journals</h4>
      <div
        style={{ fontSize: 12, marginBottom: 8 }}
      >
        Trust account journal entries PayTrade has posted for this claim and
        any payments under it.
        {showingCapNote
          ? ` Showing the most recent ${cap} entries — older entries may exist on the account ledger.`
          : ""}
      </div>
      {/*
        IMPORTANT: do NOT use the shared `dataTable nowrap` styling here.
        The `nowrap` class forces cells to a single line, and the long
        Process descriptions ("To take up the payments of retentions ...
        Payment claim #100032 ($864.82)") push the table to several
        thousand pixels wide. In the View Claim drawer's flex/grid layout
        chain (where flex items default to min-width: auto), that width
        propagates all the way up and stretches the entire page off the
        right edge of the viewport — even with overflow:hidden on
        ancestors, because overflow:hidden does NOT prevent a block from
        being SIZED to its content.

        Using `table-layout: fixed` + explicit `width: 100%` plus
        `word-break: break-word` makes the table physically incapable of
        being wider than its container, regardless of cell content.
      */}
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            maxWidth: "100%",
            tableLayout: "fixed",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <colgroup>
            <col style={{ width: "10%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "30%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>
          <thead>
            <tr style={{ background: "#f7f7f7", textAlign: "left" }}>
              <th style={{ padding: "6px 8px" }}>Date</th>
              <th style={{ padding: "6px 8px" }}>Journal #</th>
              <th style={{ padding: "6px 8px" }}>Account</th>
              <th style={{ padding: "6px 8px" }}>Process</th>
              <th style={{ padding: "6px 8px" }}>Reference</th>
              <th style={{ padding: "6px 8px", textAlign: "right" }}>Debit</th>
              <th style={{ padding: "6px 8px", textAlign: "right" }}>Credit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                <td style={{ padding: "6px 8px", wordBreak: "break-word" }}>
                  {fmtDate(r.journal_date)}
                </td>
                <td style={{ padding: "6px 8px", wordBreak: "break-word" }}>
                  {r.journal_number || "-"}
                </td>
                <td style={{ padding: "6px 8px", wordBreak: "break-word" }}>
                  {r.account_name || "-"}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 0,
                  }}
                  title={r.process_label || ""}
                >
                  {r.process_label || "-"}
                </td>
                <td style={{ padding: "6px 8px", wordBreak: "break-word" }}>
                  {r.audit_kind === "claim"
                    ? "Claim"
                    : r.audit_kind === "payment" && r.payment_id_ref
                    ? `Payment #${r.payment_id_ref}`
                    : "-"}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    textAlign: "right",
                    wordBreak: "break-word",
                  }}
                >
                  {fmtAmount(r.debit_amount)}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    textAlign: "right",
                    wordBreak: "break-word",
                  }}
                >
                  {fmtAmount(r.credit_amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <br />
    </div>
  );
}
