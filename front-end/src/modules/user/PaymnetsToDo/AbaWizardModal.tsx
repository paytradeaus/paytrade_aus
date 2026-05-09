import React, { useEffect, useMemo, useState } from "react";
import BaseModal from "@/components/BaseModal";
import FormikControl from "@/components/FormikControl";
import { InputType } from "@/shared/constant/general";
import {
  GetAbaWizardSenderAccounts,
  GetAbaWizardOutstandingPayments,
} from "@/utils/export";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { convertPositiveDecimalTwoDigit } from "@/utils";
import { currencySymbol } from "@/shared/constant/general";

type SenderAccount = {
  bank_account_id: number;
  company_id: number;
  account_name: string;
  account_number: string;
  bsb_number: string;
  apca_number: number | null;
  has_apca: boolean;
  eligible_count: number;
};

type OutstandingPayment = {
  sub_payment_id: number;
  payment_id: number | null;
  payment_type: string;
  sub_payment_type: string;
  recipient_name: string;
  recipient_account_number: string;
  recipient_bsb: string;
  amount: number;
  project_name: string;
  contract_name: string;
  due_date: string | null;
  is_eligible: boolean;
  missing_fields: string[];
};

type Props = {
  open: boolean;
  companyId: number;
  onClose: () => void;
  onGenerate: (args: {
    bankAccountId: number;
    subPaymentIds: number[];
    markPaid: "yes" | null;
  }) => Promise<void> | void;
};

const formatMoney = (n: number) =>
  `${currencySymbol} ${convertPositiveDecimalTwoDigit(n || 0, true)}`;

const formatDate = (d: string | null) => {
  if (!d) return "-";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "-";
    return dt.toISOString().slice(0, 10);
  } catch {
    return "-";
  }
};

export default function AbaWizardModal({
  open,
  companyId,
  onClose,
  onGenerate,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [accounts, setAccounts] = useState<SenderAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null,
  );
  const [payments, setPayments] = useState<OutstandingPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [selectedSubIds, setSelectedSubIds] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSelectedAccountId(null);
    setPayments([]);
    setSelectedSubIds(new Set());
    setGenerating(false);
    (async () => {
      setAccountsLoading(true);
      const data = await GetAbaWizardSenderAccounts(companyId);
      setAccounts(data || []);
      setAccountsLoading(false);
    })();
  }, [open, companyId]);

  // Load payments when account picked + step 2
  useEffect(() => {
    if (step !== 2 || !selectedAccountId) return;
    (async () => {
      setPaymentsLoading(true);
      const data = await GetAbaWizardOutstandingPayments(
        companyId,
        selectedAccountId,
      );
      setPayments(data || []);
      // pre-select all eligible
      setSelectedSubIds(
        new Set(
          (data || [])
            .filter((p: OutstandingPayment) => p.is_eligible)
            .map((p: OutstandingPayment) => p.sub_payment_id),
        ),
      );
      setPaymentsLoading(false);
    })();
  }, [step, selectedAccountId, companyId]);

  const selectedAccount = useMemo(
    () =>
      accounts.find(
        (a) => Number(a.bank_account_id) === Number(selectedAccountId),
      ) || null,
    [accounts, selectedAccountId],
  );

  const eligiblePayments = useMemo(
    () => payments.filter((p) => p.is_eligible),
    [payments],
  );

  const allEligibleSelected =
    eligiblePayments.length > 0 &&
    eligiblePayments.every((p) => selectedSubIds.has(p.sub_payment_id));

  const toggleAll = () => {
    if (allEligibleSelected) {
      setSelectedSubIds(new Set());
    } else {
      setSelectedSubIds(
        new Set(eligiblePayments.map((p) => p.sub_payment_id)),
      );
    }
  };

  const togglePayment = (id: number) => {
    setSelectedSubIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ---------- Step 1 ----------
  const accountOptions = useMemo(
    () =>
      accounts.map((a) => ({
        label: `${a.account_name} — ${a.eligible_count} outstanding${
          a.has_apca ? "" : " (no APCA)"
        }`,
        value: a.bank_account_id,
      })),
    [accounts],
  );

  const renderStep1 = () => (
    <div>
      <h4 className="text_center" style={{ marginBottom: 12 }}>
        Step 1 — Choose sending account
      </h4>
      {accountsLoading ? (
        <p style={{ textAlign: "center" }}>Loading sender accounts…</p>
      ) : accounts.length === 0 ? (
        <p style={{ textAlign: "center" }}>
          No sender accounts have outstanding payments to generate an ABA file
          for.
        </p>
      ) : (
        <>
          <FormikControl
            placeholder="Select a sending account"
            name="abaWizardSenderAccount"
            options={accountOptions}
            // Shared <Select> is a native <select> and, with the default
            // returnSelectedObject=false, passes the raw string value from
            // e.target.value — NOT an option object. Coerce to a number
            // (or null) so `selectedAccountId` actually gets set when the
            // user picks an account; otherwise the Next button stays
            // disabled because selectedAccountId remains null.
            onChange={(val: any) => {
              if (val == null || val === "") {
                setSelectedAccountId(null);
                return;
              }
              const id =
                typeof val === "object" ? val?.value : Number(val);
              setSelectedAccountId(
                id != null && !Number.isNaN(id) ? Number(id) : null,
              );
            }}
            control={InputType.SELECT}
            // Native <select> wants a primitive value, not an option object.
            value={selectedAccountId ?? ""}
            renderKey="label"
            valueKey="value"
          />
          {selectedAccount && (
            <div
              style={{
                marginTop: 10,
                padding: "8px 10px",
                background: "#f7f9fc",
                border: "1px solid #e3e8ef",
                borderRadius: 4,
                fontSize: 12,
                color: "#444",
              }}
            >
              BSB {selectedAccount.bsb_number || "—"} · Acct{" "}
              {selectedAccount.account_number || "—"} ·{" "}
              <b>{selectedAccount.eligible_count}</b> outstanding payment(s)
            </div>
          )}
          {selectedAccount && !selectedAccount.has_apca && (
            <div
              role="alert"
              style={{
                marginTop: 12,
                padding: "12px 14px",
                background: "#fff4e5",
                border: "2px solid #f5a623",
                borderRadius: 6,
                fontSize: 14,
                color: "#874d00",
                fontWeight: 500,
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  APCA / Direct Entry user ID is missing
                </div>
                <div style={{ marginBottom: 8, fontWeight: 400 }}>
                  An ABA file can't be generated for this account until an
                  APCA number is set.
                </div>
                <a
                  href={`${AppRoutes.USER_EDIT_BANK_ACCOUNTS}/${selectedAccount.company_id}/${selectedAccount.bank_account_id}?routedFrom=payments-to-do`}
                  onClick={() => onClose()}
                  style={{
                    color: "#0070f3",
                    textDecoration: "underline",
                    fontWeight: 600,
                  }}
                >
                  Fix this account →
                </a>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ---------- Step 2 ----------
  const renderStep2 = () => (
    <div>
      <h4 className="text_center" style={{ marginBottom: 4 }}>
        Step 2 — Select payments
      </h4>
      <p style={{ textAlign: "center", color: "#666", marginBottom: 12 }}>
        Sender: <b>{selectedAccount?.account_name}</b>
      </p>
      {paymentsLoading ? (
        <p style={{ textAlign: "center" }}>Loading payments…</p>
      ) : payments.length === 0 ? (
        <p style={{ textAlign: "center" }}>
          No outstanding payments for this account.
        </p>
      ) : (
        <div
          style={{
            maxHeight: 360,
            overflowY: "auto",
            overflowX: "auto",
            border: "1px solid #eee",
            borderRadius: 4,
          }}
        >
          {/*
            Fixed table layout + explicit column widths so long Project /
            Contract / Recipient strings wrap predictably instead of
            squashing the short columns (Type / Due / Amount) onto two
            lines. Long lists scroll vertically inside the bounded
            container.
          */}
          <table
            style={{
              width: "100%",
              minWidth: 640,
              fontSize: 13,
              tableLayout: "fixed",
              borderCollapse: "collapse",
            }}
          >
            <colgroup>
              <col style={{ width: 36 }} />
              <col style={{ width: "26%" }} />
              <col style={{ width: 90 }} />
              <col />
              <col style={{ width: 96 }} />
              <col style={{ width: 110 }} />
            </colgroup>
            <thead
              style={{ position: "sticky", top: 0, background: "#f7f7f7", zIndex: 1 }}
            >
              <tr style={{ textAlign: "left" }}>
                <th style={{ padding: 8 }}>
                  <input
                    type="checkbox"
                    checked={allEligibleSelected}
                    onChange={toggleAll}
                    disabled={eligiblePayments.length === 0}
                    aria-label="Select all eligible payments"
                  />
                </th>
                <th style={{ padding: 8 }}>Recipient</th>
                <th style={{ padding: 8 }}>Type</th>
                <th style={{ padding: 8 }}>Project / Contract</th>
                <th style={{ padding: 8, whiteSpace: "nowrap" }}>Due</th>
                <th style={{ padding: 8, textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const checked = selectedSubIds.has(p.sub_payment_id);
                return (
                  <tr
                    key={p.sub_payment_id}
                    style={{
                      borderTop: "1px solid #f3f3f3",
                      background: !p.is_eligible ? "#fff4e5" : "white",
                    }}
                  >
                    <td style={{ padding: 8, verticalAlign: "top" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!p.is_eligible}
                        onChange={() => togglePayment(p.sub_payment_id)}
                        aria-label={`Select payment ${p.sub_payment_id}`}
                      />
                    </td>
                    <td
                      style={{
                        padding: 8,
                        verticalAlign: "top",
                        wordBreak: "break-word",
                      }}
                    >
                      <div>{p.recipient_name || "-"}</div>
                      {!p.is_eligible && (
                        <div style={{ fontSize: 11, color: "#874d00" }}>
                          Missing: {p.missing_fields.join(", ")}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        padding: 8,
                        verticalAlign: "top",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.sub_payment_type || "-"}
                    </td>
                    <td
                      style={{
                        padding: 8,
                        verticalAlign: "top",
                        wordBreak: "break-word",
                      }}
                    >
                      {p.project_name || "-"}
                      {p.contract_name ? ` / ${p.contract_name}` : ""}
                    </td>
                    <td
                      style={{
                        padding: 8,
                        verticalAlign: "top",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(p.due_date)}
                    </td>
                    <td
                      style={{
                        padding: 8,
                        verticalAlign: "top",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatMoney(p.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
        {selectedSubIds.size} of {eligiblePayments.length} eligible payment(s)
        selected.
      </p>
    </div>
  );

  // ---------- Step 3 ----------
  const renderStep3 = () => (
    <div className="text_center">
      <h4>Step 3 — Mark as paid?</h4>
      <p style={{ marginTop: 12 }}>
        You're about to generate an ABA file for{" "}
        <b>{selectedSubIds.size}</b> payment(s) from{" "}
        <b>{selectedAccount?.account_name}</b>.
      </p>
      <p style={{ marginTop: 12 }}>
        Do you want to mark these payments as paid after generating the ABA
        file?
      </p>
    </div>
  );

  // ---------- Footer wiring ----------
  // Step 1: secondary = Next (enabled if account chosen)
  // Step 2: first = Back, second = Next (enabled if at least 1 selected)
  // Step 3: first = "No, just generate", second = "Yes, mark as paid"
  let footer:
    | {
        firstName?: string;
        secondName: string;
        hideFirst?: boolean;
        disableSecond?: boolean;
        onFirst: () => void;
        onSecond: () => void;
      }
    | null = null;

  if (step === 1) {
    footer = {
      hideFirst: true,
      secondName: "Next",
      disableSecond:
        !selectedAccountId ||
        !selectedAccount ||
        !selectedAccount.has_apca,
      onFirst: () => {},
      onSecond: () => setStep(2),
    };
  } else if (step === 2) {
    footer = {
      firstName: "Back",
      secondName: "Next",
      disableSecond: selectedSubIds.size === 0,
      onFirst: () => setStep(1),
      onSecond: () => setStep(3),
    };
  } else {
    footer = {
      firstName: "No, just generate",
      secondName: "Yes, mark as paid",
      disableSecond: generating,
      onFirst: async () => {
        if (generating || !selectedAccountId) return;
        setGenerating(true);
        try {
          await onGenerate({
            bankAccountId: selectedAccountId,
            subPaymentIds: Array.from(selectedSubIds),
            markPaid: null,
          });
        } finally {
          setGenerating(false);
        }
      },
      onSecond: async () => {
        if (generating || !selectedAccountId) return;
        setGenerating(true);
        try {
          await onGenerate({
            bankAccountId: selectedAccountId,
            subPaymentIds: Array.from(selectedSubIds),
            markPaid: "yes",
          });
        } finally {
          setGenerating(false);
        }
      },
    };
  }

  if (!open) return null;

  return (
    <BaseModal
      modalId="aba-wizard-modal"
      displayModal={open}
      title="Generate ABA file"
      onHeaderIconClose={onClose}
      restrictOncloseFunctionInHeader
      onClose={() => {
        footer!.onFirst();
        // On step 3 the first button ("No, just generate") triggers the
        // generation flow and the modal must close. Returning true lets
        // BaseModal run closeModal() which removes the `is-modal-open`
        // class from <html>; otherwise the page is left with a stuck
        // overlay that blocks all clicks. Steps 1 & 2 just transition
        // between steps and must keep the modal open.
        return step === 3;
      }}
      onConfirm={() => {
        footer!.onSecond();
        return step === 3;
      }}
      firstButtonName={footer.firstName || "Cancel"}
      secondButtonName={footer.secondName}
      hideFirstButton={footer.hideFirst}
      disableSecondButton={footer.disableSecond}
    >
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </BaseModal>
  );
}
