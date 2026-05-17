"use client";

import React, { useEffect, useState } from "react";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { useTokenDetails } from "@/hooks";
import {
  detachAiBillingPaymentMethod,
  fetchAiBillingOverview,
  fetchAiCreditLedger,
  fetchAiCreditPurchases,
  triggerManualTopup,
  updateAiBillingSettings,
} from "./aiBilling.functions";
import StripeCardModal, { openStripeCardModal } from "./StripeCardModal";

const fmtUsd = (v: any) =>
  typeof v === "number" ? `$${v.toFixed(2)}` : `$${Number(v ?? 0).toFixed(2)}`;

const CARD_BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
  unknown: "Card",
};

const formatCardBrand = (brand?: string | null) => {
  if (!brand) return "Card";
  const key = String(brand).toLowerCase();
  return (
    CARD_BRAND_LABELS[key] ??
    key.charAt(0).toUpperCase() + key.slice(1)
  );
};

export default function AiBillingPanel() {
  const { decodeTokenData }: any = useTokenDetails();
  const decoded = decodeTokenData?.() ?? {};
  // IMPORTANT: only use the JWT's pinned company_id. The legacy
  // localStorage `companyId` can drift from the JWT after a sudo /
  // company switch and the BE assertCompanyAccess will then 403 with
  // "Forbidden: company mismatch" (see prod log review 2026-05-17).
  const companyId = Number(decoded?.company_id ?? 0);

  const [overview, setOverview] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupAmt, setTopupAmt] = useState<number>(20);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [trigger, setTrigger] = useState<number>(5);
  const [topupAmount, setTopupAmount] = useState<number>(20);
  const [monthlyCap, setMonthlyCap] = useState<number>(200);
  const [billingEmail, setBillingEmail] = useState<string>("");
  const [cardClientSecret, setCardClientSecret] = useState<string | null>(null);

  const reload = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [ov, lg, pu] = await Promise.all([
        fetchAiBillingOverview(companyId),
        fetchAiCreditLedger(companyId, 50),
        fetchAiCreditPurchases(companyId),
      ]);
      setOverview(ov);
      setLedger(lg);
      setPurchases(pu);
      if (ov?.settings) {
        setAutoEnabled(!!ov.settings.auto_topup_enabled);
        setTrigger(Number(ov.settings.low_balance_trigger_usd ?? 5));
        setTopupAmount(Number(ov.settings.topup_amount_usd ?? 20));
        setMonthlyCap(Number(ov.settings.monthly_topup_cap_usd ?? 200));
        setBillingEmail(ov.settings.billing_email ?? "");
      }
    } catch (err: any) {
      showErrorToast(err?.message ?? "Failed to load AI billing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const onSaveSettings = async () => {
    try {
      await updateAiBillingSettings(companyId, {
        auto_topup_enabled: autoEnabled,
        low_balance_trigger_usd: trigger,
        topup_amount_usd: topupAmount,
        monthly_topup_cap_usd: monthlyCap,
        billing_email: billingEmail || null,
      });
      showSuccessToast("AI billing settings saved");
      reload();
    } catch (err: any) {
      showErrorToast(err?.message ?? "Failed to save settings");
    }
  };

  const onRemovePaymentMethod = async () => {
    const confirmed =
      typeof window !== "undefined" &&
      window.confirm(
        "Remove the saved card on file?\n\n" +
          "• The card will be detached from Stripe and cleared from your AI billing settings.\n" +
          "• Automatic top-up will be turned off so we don't try to charge a missing card.\n" +
          "• You can add a new card any time using 'Add/replace card'."
      );
    if (!confirmed) return;
    try {
      await detachAiBillingPaymentMethod(companyId);
      showSuccessToast("Card removed and auto top-up turned off");
      reload();
    } catch (err: any) {
      showErrorToast(err?.message ?? "Failed to remove card");
    }
  };

  const onCapturePaymentMethod = async () => {
    try {
      const clientSecret = await openStripeCardModal(
        companyId,
        !!overview?.settings?.is_sandbox
      );
      setCardClientSecret(clientSecret);
    } catch (err: any) {
      showErrorToast(err?.message ?? "Failed to start card capture");
    }
  };

  const onManualTopup = async () => {
    try {
      const r = await triggerManualTopup(
        companyId,
        topupAmt,
        !!overview?.settings?.is_sandbox
      );
      if (r?.status === "succeeded") {
        showSuccessToast(
          `Top-up succeeded — added ${fmtUsd(r.credits_purchased_usd)}`
        );
      } else {
        showErrorToast(r?.failure_reason ?? `Top-up status: ${r?.status}`);
      }
      reload();
    } catch (err: any) {
      showErrorToast(err?.message ?? "Top-up failed");
    }
  };

  if (loading && !overview) {
    return <div className="container-fluid">Loading AI billing…</div>;
  }

  return (
    <div className="container-fluid" style={{ padding: 16 }}>
      <h2>AI credits &amp; billing</h2>
      <p style={{ color: "#666" }}>
        AI credits are consumed when you use AI-powered features. Your monthly
        plan allotment is granted on the 1st of each calendar month and{" "}
        <strong>does not roll over</strong>. Top up any time to continue using
        AI tools.
      </p>

      <section style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={card}>
          <div style={cardLabel}>Current balance</div>
          <div style={cardValue}>{fmtUsd(overview?.balance_usd)}</div>
          {overview?.is_below_trigger ? (
            <div style={{ color: "#b00020" }}>Below low-balance trigger</div>
          ) : null}
        </div>
        <div style={card}>
          <div style={cardLabel}>Plan monthly allotment</div>
          <div style={cardValue}>
            {fmtUsd(overview?.plan_monthly_credit_usd)}
          </div>
          <div>{overview?.plan_name ?? "—"}</div>
        </div>
      </section>

      <h3 style={{ marginTop: 24 }}>One-off top-up</h3>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label>USD</label>
        <input
          type="number"
          min={1}
          value={topupAmt}
          onChange={(e) => setTopupAmt(Number(e.target.value))}
          style={{ width: 100 }}
        />
        <button onClick={onManualTopup}>Top up now</button>
        <button onClick={onCapturePaymentMethod}>
          {overview?.saved_card ? "Replace card" : "Add card"}
        </button>
        {overview?.settings?.stripe_payment_method_id ? (
          <button
            onClick={onRemovePaymentMethod}
            style={{ color: "#b00020" }}
            title="Detach the saved card and turn off auto top-up"
          >
            Remove card
          </button>
        ) : null}
        {overview?.saved_card ? (
          <span style={{ color: "#444" }}>
            {formatCardBrand(overview.saved_card.brand)} ••••{" "}
            {overview.saved_card.last4} — exp{" "}
            {String(overview.saved_card.exp_month).padStart(2, "0")}/
            {String(overview.saved_card.exp_year).slice(-2)}
          </span>
        ) : overview?.settings?.stripe_payment_method_id ? (
          <span style={{ color: "#666" }}>Card on file</span>
        ) : (
          <span style={{ color: "#666" }}>No card on file</span>
        )}
      </div>
      {overview?.settings?.stripe_payment_method_id ? (
        <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
          A card is on file. Removing it will also disable automatic top-up.
        </div>
      ) : null}

      <h3 style={{ marginTop: 24 }}>Auto top-up settings</h3>
      <div style={{ display: "grid", gap: 8, maxWidth: 480 }}>
        <label>
          <input
            type="checkbox"
            checked={autoEnabled}
            onChange={(e) => setAutoEnabled(e.target.checked)}
          />{" "}
          Enable automatic top-up when balance falls below trigger
        </label>
        <label>
          Low-balance trigger (USD){" "}
          <input
            type="number"
            min={0}
            value={trigger}
            onChange={(e) => setTrigger(Number(e.target.value))}
          />
        </label>
        <label>
          Top-up amount (USD){" "}
          <input
            type="number"
            min={1}
            value={topupAmount}
            onChange={(e) => setTopupAmount(Number(e.target.value))}
          />
        </label>
        <label>
          Monthly cap (USD){" "}
          <input
            type="number"
            min={0}
            value={monthlyCap}
            onChange={(e) => setMonthlyCap(Number(e.target.value))}
          />
        </label>
        <label>
          Billing email (optional override){" "}
          <input
            type="email"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
          />
        </label>
        <button onClick={onSaveSettings}>Save settings</button>
      </div>

      <h3 style={{ marginTop: 24 }}>Recent activity</h3>
      <table cellPadding={6} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">When</th>
            <th align="left">Event</th>
            <th align="right">Amount (USD)</th>
            <th align="right">Balance after</th>
            <th align="left">Notes</th>
          </tr>
        </thead>
        <tbody>
          {ledger.map((l: any) => (
            <tr key={l.id}>
              <td>{new Date(l.created_on).toLocaleString()}</td>
              <td>{l.event_type}</td>
              <td align="right">{fmtUsd(l.amount_usd)}</td>
              <td align="right">{fmtUsd(l.balance_after)}</td>
              <td>{l.notes ?? "—"}</td>
            </tr>
          ))}
          {ledger.length === 0 ? (
            <tr>
              <td colSpan={5}>No activity yet.</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <h3 style={{ marginTop: 24 }}>Top-up history</h3>
      <table cellPadding={6} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Date</th>
            <th align="left">Trigger</th>
            <th align="right">Credits</th>
            <th align="right">Stripe fee</th>
            <th align="right">Total charged</th>
            <th align="left">Status</th>
            <th align="left">Receipt</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((p: any) => {
            const currency = String(p.currency ?? "usd").toUpperCase();
            const isAud = currency === "AUD";
            const total = Number(p.amount_charged_usd ?? 0);
            const gst = isAud ? total / 11 : 0;
            const subtotal = total - gst;
            return (
              <tr key={p.id}>
                <td>{new Date(p.created_on).toLocaleString()}</td>
                <td>{p.trigger_type}</td>
                <td align="right">{fmtUsd(p.credits_purchased_usd)}</td>
                <td align="right">{fmtUsd(p.stripe_fee_usd)}</td>
                <td align="right">
                  {fmtUsd(total)}
                  {isAud ? (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#555",
                        marginTop: 2,
                        lineHeight: 1.4,
                        textAlign: "right",
                      }}
                    >
                      <div>Subtotal (ex GST): {fmtUsd(subtotal)} AUD</div>
                      <div>GST (10%): {fmtUsd(gst)} AUD</div>
                      <div>Total (incl GST): {fmtUsd(total)} AUD</div>
                    </div>
                  ) : null}
                </td>
                <td>{p.status}</td>
                <td>
                  {p.receipt_pdf_url ? (
                    <a
                      href={p.receipt_pdf_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      PDF
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
          {purchases.length === 0 ? (
            <tr>
              <td colSpan={7}>No top-ups yet.</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {cardClientSecret ? (
        <StripeCardModal
          companyId={companyId}
          isSandbox={!!overview?.settings?.is_sandbox}
          clientSecret={cardClientSecret}
          onClose={() => setCardClientSecret(null)}
          onAttached={() => {
            setCardClientSecret(null);
            reload();
          }}
        />
      ) : null}
    </div>
  );
}

const card: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: 16,
  minWidth: 220,
};
const cardLabel: React.CSSProperties = { color: "#666", fontSize: 12 };
const cardValue: React.CSSProperties = { fontSize: 28, fontWeight: 600 };
