import { useEffect, useState } from "react";
import BaseModal from "@/components/BaseModal";
import {
  CloseOrChangeBankAccount,
  GetBankAccountPreflight,
} from "./AddUpdateBankAccount.function";

interface Props {
  bankAccountId: number;
  currentAccountName?: string;
  onClose: () => void;
  onDone?: () => void;
}

/**
 * Task #244 — close-only modal. The Transferred path has moved to the
 * dedicated Trust Account Transfer wizard. This modal now surfaces the
 * server-side preflight as an explicit list of failed-checks so the
 * user knows exactly what to fix before the Close button is enabled.
 */
export default function CloseOrChangeAccountModal({
  bankAccountId,
  currentAccountName,
  onClose,
  onDone,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [effectiveDate, setEffectiveDate] = useState<string>(today);
  const [markAsSent, setMarkAsSent] = useState<boolean>(false);
  const [preflight, setPreflight] = useState<any>(null);
  const [loadingPreflight, setLoadingPreflight] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPreflight(true);
      const res = await GetBankAccountPreflight(bankAccountId);
      if (cancelled) return;
      setPreflight(res?.preflight ?? null);
      setLoadingPreflight(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [bankAccountId]);

  const canClose = !!preflight?.can_close && !!effectiveDate;

  const handleConfirm = async () => {
    setSubmitting(true);
    const ok = await CloseOrChangeBankAccount({
      bank_account_id: Number(bankAccountId),
      closing_mode: "Closed",
      closing_effective_date: effectiveDate,
      mark_notices_as_sent: markAsSent,
    });
    setSubmitting(false);
    if (ok) {
      onDone?.();
      onClose();
    }
  };

  return (
    <BaseModal
      modalId="close-bank-account"
      displayModal
      title="Close account"
      firstButtonName="Cancel"
      secondButtonName={submitting ? "Submitting…" : "Close & queue notices"}
      disableSecondButton={submitting || !canClose || loadingPreflight}
      onClose={onClose}
      onConfirm={() => {
        handleConfirm();
        return true;
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {currentAccountName && (
          <p style={{ margin: 0 }}>
            <strong>Account:</strong> {currentAccountName}
          </p>
        )}
        <div
          style={{
            background: "#eef4ff",
            border: "1px solid #c5d6f5",
            padding: 10,
            borderRadius: 4,
            fontSize: "0.85rem",
          }}
        >
          Looking to move the balance to a new trust account? Use{" "}
          <strong>Transfer to another account</strong> instead — the wizard
          re-points contracts and in-flight items atomically and gates on the
          bank actually moving the money.
        </div>

        {loadingPreflight && <p>Running preflight…</p>}

        {!loadingPreflight && preflight && (
          <>
            <div>
              <strong>Preflight</strong>
              <ul style={{ margin: "0.5rem 0", paddingLeft: 18 }}>
                <li>
                  Current balance: ${Number(preflight.current_balance ?? 0).toFixed(2)}
                </li>
                <li>In-flight payments: {preflight.in_flight_payments_count}</li>
                <li>Open claims: {preflight.open_claims_count}</li>
                <li>Open retention: {preflight.open_retention_count}</li>
              </ul>
            </div>
            {preflight.close_blockers?.length > 0 && (
              <div
                style={{
                  background: "#fde2e2",
                  border: "1px solid #f5b3b3",
                  padding: 10,
                  borderRadius: 4,
                }}
              >
                <strong>Resolve before closing:</strong>
                <ul style={{ margin: "0.5rem 0 0", paddingLeft: 18 }}>
                  {preflight.close_blockers.map((b: string) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <div>
          <label style={{ display: "block", marginBottom: "0.25rem" }}>
            Effective date
          </label>
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        <label>
          <input
            type="checkbox"
            checked={markAsSent}
            onChange={(e) => setMarkAsSent(e.target.checked)}
          />{" "}
          Mark notices as already sent (lodged outside PayTrade)
        </label>

        <p style={{ margin: 0, fontSize: "0.85rem", color: "#666" }}>
          On Close, PayTrade queues a QBCC TA2 closing notice and a
          Contracting Party Account Closing Notice for every contracted
          beneficiary. You can review them from the Notices to Send list.
        </p>
      </div>
    </BaseModal>
  );
}
