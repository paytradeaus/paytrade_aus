import { useEffect, useState } from "react";
import BaseModal from "@/components/BaseModal";
import {
  GetBankAccountPreflight,
  StartTrustAccountTransfer,
  ConfirmTrustAccountTransfer,
} from "./AddUpdateBankAccount.function";
import { apolloClient } from "@/network/apolloClient";
import { gql } from "@apollo/client";

interface Props {
  sourceBankAccountId: number;
  sourceAccountName?: string;
  sourceAccountType?: string;
  onClose: () => void;
  onDone?: () => void;
}

/**
 * Task #244 — Trust Account Transfer wizard.
 *
 * Three steps:
 *  1. Preflight summary (open claims, in-flight payments, balance) — read-only.
 *  2. Destination picker — eligible PTA/RTA accounts in the same company,
 *     same account_type, status='Open'. Date + amount entry.
 *  3. Review + confirm — calls startTrustAccountTransfer, then optionally
 *     confirmTrustAccountTransfer to fire the atomic cutover immediately.
 *
 * The cutover is gated server-side and will only fire when the wizard
 * caller hits "Confirm transfer now" — otherwise the transfer row sits
 * in `Pending` waiting for a Xero BankTransfer match or reconciliation.
 */
export default function TransferTrustAccountWizard({
  sourceBankAccountId,
  sourceAccountName,
  sourceAccountType,
  onClose,
  onDone,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [preflight, setPreflight] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [eligibleAccounts, setEligibleAccounts] = useState<any[]>([]);
  const [destinationId, setDestinationId] = useState<number | null>(null);
  const [transferDate, setTransferDate] = useState<string>(today);
  const [amount, setAmount] = useState<string>("");
  const [confirmNow, setConfirmNow] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Load preflight + eligible destinations on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const pre = await GetBankAccountPreflight(sourceBankAccountId);
      if (cancelled) return;
      setPreflight(pre?.preflight ?? null);
      if (pre?.preflight?.current_balance != null) {
        setAmount(String(pre.preflight.current_balance));
      }
      // Eligible destinations: query all bank accounts of same type, status=Open, exclude self.
      try {
        const resp = await apolloClient.query({
          query: gql`
            query FetchAllBankAccountsForTransfer(
              $payload: FetchAllBankAccountsInput!
            ) {
              fetchAllBankAccounts(payload: $payload) {
                data {
                  bank_account_id
                  account_name
                  account_type
                  status
                }
                status
              }
            }
          `,
          variables: {
            payload: { keyword: null, page: 1, perPage: 500 },
          },
          fetchPolicy: "no-cache",
        });
        const all = resp?.data?.fetchAllBankAccounts?.data ?? [];
        setEligibleAccounts(
          all.filter(
            (a: any) =>
              Number(a.bank_account_id) !== Number(sourceBankAccountId) &&
              a.status === "Open" &&
              a.account_type === sourceAccountType,
          ),
        );
      } catch {
        setEligibleAccounts([]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceBankAccountId, sourceAccountType]);

  const handleSubmit = async () => {
    if (!destinationId) return;
    setSubmitting(true);
    const created = await StartTrustAccountTransfer({
      source_bank_account_id: sourceBankAccountId,
      destination_bank_account_id: destinationId,
      transfer_date: transferDate,
      amount: Number(amount),
    });
    if (!created) {
      setSubmitting(false);
      return;
    }
    if (confirmNow) {
      const ok = await ConfirmTrustAccountTransfer(Number(created.transfer_id));
      setSubmitting(false);
      if (ok) {
        onDone?.();
        onClose();
      }
      return;
    }
    setSubmitting(false);
    onDone?.();
    onClose();
  };

  const secondButtonName =
    step === 1 ? "Next: pick destination" : step === 2 ? "Next: review" : submitting ? "Submitting…" : confirmNow ? "Start & confirm transfer" : "Start transfer";

  return (
    <BaseModal
      modalId="transfer-trust-account-wizard"
      displayModal
      title={`Transfer ${sourceAccountType ?? "trust account"} balance`}
      firstButtonName={step === 1 ? "Cancel" : "Back"}
      secondButtonName={secondButtonName}
      disableSecondButton={
        submitting ||
        (step === 1 && !preflight?.can_transfer) ||
        (step === 2 && (!destinationId || !(Number(amount) > 0)))
      }
      onClose={() => {
        if (step === 1) onClose();
        else setStep((step - 1) as any);
      }}
      onConfirm={() => {
        if (step === 1) setStep(2);
        else if (step === 2) setStep(3);
        else handleSubmit();
        return true;
      }}
    >
      {loading && <p>Loading preflight…</p>}

      {!loading && step === 1 && preflight && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0 }}>
            <strong>Account:</strong> {sourceAccountName} ({sourceAccountType})
          </p>
          <p style={{ margin: 0 }}>
            <strong>Current balance:</strong> ${Number(preflight.current_balance ?? 0).toFixed(2)}
          </p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>In-flight payments: {preflight.in_flight_payments_count}</li>
            <li>Open claims: {preflight.open_claims_count}</li>
            <li>Open retention: {preflight.open_retention_count}</li>
            <li>Linked projects/contracts: {preflight.linked_projects?.length ?? 0}</li>
          </ul>
          {preflight.transfer_blockers?.length > 0 && (
            <div style={{ background: "#fff3cd", padding: 8, borderRadius: 4 }}>
              <strong>Cannot transfer yet:</strong>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {preflight.transfer_blockers.map((b: string) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#666" }}>
            Carry-across: all open items above will be re-pointed at the destination on cutover. (Per-item exclusion is planned for a follow-up.)
          </p>
        </div>
      )}

      {!loading && step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Destination account ({sourceAccountType})
            </label>
            <select
              value={destinationId ?? ""}
              onChange={(e) => setDestinationId(Number(e.target.value) || null)}
              style={{ width: "100%" }}
            >
              <option value="">— Select destination —</option>
              {eligibleAccounts.map((a) => (
                <option key={a.bank_account_id} value={a.bank_account_id}>
                  {a.account_name} (id {a.bank_account_id})
                </option>
              ))}
            </select>
            {eligibleAccounts.length === 0 && (
              <p style={{ color: "#a00", margin: "8px 0 0", fontSize: "0.85rem" }}>
                No eligible Open {sourceAccountType} accounts found. Create one first.
              </p>
            )}
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4 }}>Transfer date</label>
            <input
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4 }}>Amount</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      )}

      {!loading && step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0 }}>
            Review your transfer. Nothing moves until you confirm. If you uncheck
            "Confirm now", the transfer will sit Pending until you reconcile or a
            matching Xero BankTransfer arrives.
          </p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>
              <strong>From:</strong> {sourceAccountName} (id {sourceBankAccountId})
            </li>
            <li>
              <strong>To:</strong>{" "}
              {eligibleAccounts.find((a) => a.bank_account_id === destinationId)
                ?.account_name ?? destinationId}
            </li>
            <li><strong>Date:</strong> {transferDate}</li>
            <li><strong>Amount:</strong> ${Number(amount).toFixed(2)}</li>
          </ul>
          <label>
            <input
              type="checkbox"
              checked={confirmNow}
              onChange={(e) => setConfirmNow(e.target.checked)}
            />{" "}
            Confirm now — apply atomic cutover immediately (you have verified the bank moved the money).
          </label>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#666" }}>
            On cutover: source flips to <em>Transferred</em>, in-flight payments and contract pointers re-point to the destination, and closing notices (TA2 + per-beneficiary) are queued.
          </p>
        </div>
      )}
    </BaseModal>
  );
}
