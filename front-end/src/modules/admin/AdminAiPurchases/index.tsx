"use client";

import React, { useEffect, useState } from "react";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import {
  fetchAdminAiPurchases,
  fetchAiUserCostMultiplier,
  setAiUserCostMultiplier,
} from "./adminAiPurchases.functions";

const fmtUsd = (v: any) => `$${Number(v ?? 0).toFixed(2)}`;

export default function AdminAiPurchases() {
  const [data, setData] = useState<any>(null);
  const [multiplier, setMultiplier] = useState<number>(1.5);
  const [filter, setFilter] = useState<any>({
    page_number: 1,
    page_size: 50,
    status: "",
    company_id: undefined,
  });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const cleanFilter: any = { ...filter };
      if (!cleanFilter.status) delete cleanFilter.status;
      if (!cleanFilter.company_id) delete cleanFilter.company_id;
      const [p, m] = await Promise.all([
        fetchAdminAiPurchases(cleanFilter),
        fetchAiUserCostMultiplier(),
      ]);
      setData(p);
      setMultiplier(Number(m ?? 1.5));
    } catch (err: any) {
      showErrorToast(err?.message ?? "Failed to load AI purchases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSaveMultiplier = async () => {
    try {
      await setAiUserCostMultiplier(multiplier);
      showSuccessToast(`Cost multiplier saved (${multiplier.toFixed(2)}×)`);
    } catch (err: any) {
      showErrorToast(err?.message ?? "Failed to save multiplier");
    }
  };

  return (
    <div className="container-fluid" style={{ padding: 16 }}>
      <h2>AI purchases</h2>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
        }}
      >
        <h3 style={{ marginTop: 0 }}>User cost multiplier</h3>
        <p style={{ color: "#666", fontSize: 13 }}>
          Multiplier applied to the raw AI provider cost before debiting a
          company&apos;s credit balance. Default is 1.50× (50% margin). Changes
          take effect immediately for new tool calls.
        </p>
        <input
          type="number"
          step="0.01"
          min={0}
          value={multiplier}
          onChange={(e) => setMultiplier(Number(e.target.value))}
          style={{ width: 100 }}
        />{" "}
        <button onClick={onSaveMultiplier}>Save multiplier</button>
      </section>

      <section style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <div style={cardLabel}>Total revenue</div>
          <div style={cardValue}>{fmtUsd(data?.total_revenue_usd)}</div>
        </div>
        <div style={card}>
          <div style={cardLabel}>Credits sold</div>
          <div style={cardValue}>{fmtUsd(data?.total_credits_sold_usd)}</div>
        </div>
        <div style={card}>
          <div style={cardLabel}>Stripe fees</div>
          <div style={cardValue}>{fmtUsd(data?.total_stripe_fees_usd)}</div>
        </div>
      </section>

      <section
        style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}
      >
        <label>
          Status:{" "}
          <select
            value={filter.status ?? ""}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </label>
        <label>
          Company ID:{" "}
          <input
            type="number"
            value={filter.company_id ?? ""}
            onChange={(e) =>
              setFilter({
                ...filter,
                company_id: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            style={{ width: 100 }}
          />
        </label>
        <button onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Apply"}
        </button>
      </section>

      <table cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th align="left">Date</th>
            <th align="left">Company</th>
            <th align="left">Trigger</th>
            <th align="right">Credits</th>
            <th align="right">Fee</th>
            <th align="right">Charged</th>
            <th align="left">Status</th>
            <th align="left">PaymentIntent</th>
          </tr>
        </thead>
        <tbody>
          {(data?.rows ?? []).map((r: any) => (
            <tr key={r.id}>
              <td>{new Date(r.created_on).toLocaleString()}</td>
              <td>
                {r.company_name ?? "—"} <br />
                <small>#{r.company_id}</small>
              </td>
              <td>{r.trigger_type}</td>
              <td align="right">{fmtUsd(r.credits_purchased_usd)}</td>
              <td align="right">{fmtUsd(r.stripe_fee_usd)}</td>
              <td align="right">{fmtUsd(r.amount_charged_usd)}</td>
              <td>
                {r.status}
                {r.failure_reason ? (
                  <div style={{ color: "#b00020", fontSize: 11 }}>
                    {r.failure_reason}
                  </div>
                ) : null}
              </td>
              <td>
                <code style={{ fontSize: 11 }}>
                  {r.stripe_payment_intent_id ?? "—"}
                </code>
              </td>
            </tr>
          ))}
          {(data?.rows ?? []).length === 0 ? (
            <tr>
              <td colSpan={8}>No purchases match the filter.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

const card: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: 12,
  minWidth: 180,
};
const cardLabel: React.CSSProperties = { color: "#666", fontSize: 12 };
const cardValue: React.CSSProperties = { fontSize: 24, fontWeight: 600 };
