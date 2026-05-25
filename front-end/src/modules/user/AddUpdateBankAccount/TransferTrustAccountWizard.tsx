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
 * Styling note: only existing system utility classes are used here
 * (width_100, mb_1, mb_0_5, mt_0_5, invalid, pt_yellow). No new CSS or
 * hardcoded colors are introduced.
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
  // Task #244 follow-up — Gap 4. Per-open-retention carry/leave choices.
  // Default is 'carry' for every row; the user can flip individual rows
  // to 'leave' which leaves them anchored on the source account post-
  // cutover (becoming stranded retention for the Task #249 panel to
  // relocate later). Backend honours this via
  // `carry_across_choices.open_retention[retention_id]` and will reject
  // a mixed-choice payment with a clear error.
  const [retentionChoices, setRetentionChoices] = useState<
    Record<string, "carry" | "leave">
  >({});

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
      if (Array.isArray(pre?.preflight?.open_retention)) {
        const init: Record<string, "carry" | "leave"> = {};
        pre.preflight.open_retention.forEach((r: any) => {
          init[String(r.id)] = "carry";
        });
        setRetentionChoices(init);
      }
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
    const choices =
      Object.keys(retentionChoices).length > 0
        ? { open_retention: retentionChoices }
        : undefined;
    const created = await StartTrustAccountTransfer({
      source_bank_account_id: sourceBankAccountId,
      destination_bank_account_id: destinationId,
      transfer_date: transferDate,
      amount: Number(amount),
      carry_across_choices: choices,
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
    step === 1
      ? "Next: pick destination"
      : step === 2
      ? "Next: review"
      : submitting
      ? "Submitting…"
      : confirmNow
      ? "Start & confirm transfer"
      : "Start transfer";

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
        <div>
          <p className="mb_0_5">
            <strong>Account:</strong> {sourceAccountName} ({sourceAccountType})
          </p>
          <p className="mb_0_5">
            <strong>Current balance:</strong> $
            {Number(preflight.current_balance ?? 0).toFixed(2)}
          </p>
          <ul className="mb_1">
            <li>In-flight payments: {preflight.in_flight_payments_count}</li>
            <li>Open claims: {preflight.open_claims_count}</li>
            <li>Open retention: {preflight.open_retention_count}</li>
            <li>
              Linked projects/contracts:{" "}
              {preflight.linked_projects?.length ?? 0}
            </li>
          </ul>
          {preflight.transfer_blockers?.length > 0 && (
            <div className="mb_1">
              <strong>Cannot transfer yet:</strong>
              <ul>
                {preflight.transfer_blockers.map((b: string) => (
                  <li key={b}>
                    <small className="invalid">{b}</small>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {preflight.open_retention?.length > 0 && (
            <div className="mb_1">
              <p className="mb_0_5">
                <strong>Open retention rows — choose per item:</strong>
              </p>
              <p className="mb_0_5">
                <small>
                  Default is <em>Carry</em> — the retained funds move with
                  the cash to the destination account. Flip to{" "}
                  <em>Leave</em> to keep a row anchored on the source
                  account (it will become stranded retention you can
                  relocate later from the source account's edit page).
                </small>
              </p>
              {preflight.open_retention.map((r: any) => {
                const choice = retentionChoices[String(r.id)] ?? "carry";
                const label =
                  r.reference ||
                  r.project_name ||
                  `Retention #${r.id}`;
                return (
                  <div key={r.id} className="mb_0_5">
                    <small>
                      <strong>{label}</strong> — $
                      {Number(r.amount ?? 0).toFixed(2)}
                      {r.party_name ? ` — ${r.party_name}` : ""}
                    </small>
                    <div>
                      <label className="mr_1">
                        <input
                          type="radio"
                          name={`ret-choice-${r.id}`}
                          checked={choice === "carry"}
                          onChange={() =>
                            setRetentionChoices((c) => ({
                              ...c,
                              [String(r.id)]: "carry",
                            }))
                          }
                        />{" "}
                        Carry to destination
                      </label>
                      <label>
                        <input
                          type="radio"
                          name={`ret-choice-${r.id}`}
                          checked={choice === "leave"}
                          onChange={() =>
                            setRetentionChoices((c) => ({
                              ...c,
                              [String(r.id)]: "leave",
                            }))
                          }
                        />{" "}
                        Leave on source
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p>
            <small>
              <span className="pt_yellow">Note:</span> In-flight payments,
              open claims, and contract pointers will be re-pointed at the
              destination on cutover. Retention choices above only affect
              <em> Retained</em> rows; all other open items always carry
              across.
            </small>
          </p>
        </div>
      )}

      {!loading && step === 2 && (
        <div>
          <div className="mb_1">
            <label>
              <strong>
                Destination account ({sourceAccountType})
              </strong>
            </label>
            <select
              className="width_100"
              value={destinationId ?? ""}
              onChange={(e) => setDestinationId(Number(e.target.value) || null)}
            >
              <option value="">— Select destination —</option>
              {eligibleAccounts.map((a) => (
                <option key={a.bank_account_id} value={a.bank_account_id}>
                  {a.account_name} (id {a.bank_account_id})
                </option>
              ))}
            </select>
            {eligibleAccounts.length === 0 && (
              <small className="invalid">
                No eligible Open {sourceAccountType} accounts found. Create
                one first.
              </small>
            )}
          </div>
          <div className="mb_1">
            <label>Transfer date</label>
            <input
              className="width_100"
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
            />
          </div>
          <div className="mb_1">
            <label>Amount</label>
            <input
              className="width_100"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
      )}

      {!loading && step === 3 && (
        <div>
          <p className="mb_1">
            Review your transfer. Nothing moves until you confirm. If you
            uncheck "Confirm now", the transfer will sit Pending until you
            reconcile or a matching Xero BankTransfer arrives.
          </p>
          <ul className="mb_1">
            <li>
              <strong>From:</strong> {sourceAccountName} (id{" "}
              {sourceBankAccountId})
            </li>
            <li>
              <strong>To:</strong>{" "}
              {eligibleAccounts.find((a) => a.bank_account_id === destinationId)
                ?.account_name ?? destinationId}
            </li>
            <li>
              <strong>Date:</strong> {transferDate}
            </li>
            <li>
              <strong>Amount:</strong> ${Number(amount).toFixed(2)}
            </li>
          </ul>
          <label className="mb_0_5">
            <input
              type="checkbox"
              checked={confirmNow}
              onChange={(e) => setConfirmNow(e.target.checked)}
            />{" "}
            Confirm now — apply atomic cutover immediately (you have verified
            the bank moved the money).
          </label>
          <p>
            <small>
              <span className="pt_yellow">Note:</span> On cutover, the source
              flips to <em>Transferred</em>, in-flight payments and contract
              pointers re-point to the destination, and closing notices
              (TA2 + per-beneficiary) are queued.
            </small>
          </p>
        </div>
      )}
    </BaseModal>
  );
}
