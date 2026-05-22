import { useState } from "react";
import BaseModal from "@/components/BaseModal";
import { CloseOrChangeBankAccount } from "./AddUpdateBankAccount.function";

type ClosingMode = "Closed" | "Transferred";

interface Props {
  bankAccountId: number;
  currentAccountName?: string;
  onClose: () => void;
  onDone?: () => void;
}

export default function CloseOrChangeAccountModal({
  bankAccountId,
  currentAccountName,
  onClose,
  onDone,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [mode, setMode] = useState<ClosingMode>("Closed");
  const [effectiveDate, setEffectiveDate] = useState<string>(today);
  const [targetName, setTargetName] = useState<string>("");
  const [targetFi, setTargetFi] = useState<string>("");
  const [targetBsb, setTargetBsb] = useState<string>("");
  const [targetAcct, setTargetAcct] = useState<string>("");
  const [targetOpening, setTargetOpening] = useState<string>(today);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const isTransfer = mode === "Transferred";

  const validate = (): string | null => {
    if (!effectiveDate) return "Effective date is required.";
    if (isTransfer) {
      if (!targetName.trim()) return "Replacement account name is required.";
      if (!targetFi.trim()) return "Replacement financial institution is required.";
      if (!targetBsb.trim() || !/^\d{6}$/.test(targetBsb))
        return "Replacement BSB must be 6 digits.";
      if (!targetAcct.trim()) return "Replacement account number is required.";
      if (!targetOpening) return "Replacement opening date is required.";
    }
    return null;
  };

  const handleConfirm = async () => {
    const err = validate();
    if (err) {
      const { showErrorToast } = await import("@/components/Toaster");
      showErrorToast(err);
      return;
    }
    setSubmitting(true);
    const payload: any = {
      bank_account_id: Number(bankAccountId),
      closing_mode: mode,
      closing_effective_date: effectiveDate,
    };
    if (isTransfer) {
      payload.closing_target_account_name = targetName.trim();
      payload.closing_target_financial_institution = targetFi.trim();
      payload.closing_target_bsb = Number(targetBsb);
      payload.closing_target_account_number = targetAcct.trim();
      payload.closing_target_opening_date = targetOpening;
    }
    const ok = await CloseOrChangeBankAccount(payload);
    setSubmitting(false);
    if (ok) {
      onDone?.();
      onClose();
    }
  };

  return (
    <BaseModal
      modalId="close-or-change-bank-account"
      displayModal
      title="Close or change account"
      firstButtonName="Cancel"
      secondButtonName={
        submitting
          ? "Submitting..."
          : isTransfer
            ? "Transfer & queue notices"
            : "Close & queue notices"
      }
      disableSecondButton={submitting}
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
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
            What is happening to this account?
          </label>
          <label style={{ marginRight: "1.5rem" }}>
            <input
              type="radio"
              name="closingMode"
              value="Closed"
              checked={mode === "Closed"}
              onChange={() => setMode("Closed")}
            />{" "}
            Closed (no replacement)
          </label>
          <label>
            <input
              type="radio"
              name="closingMode"
              value="Transferred"
              checked={mode === "Transferred"}
              onChange={() => setMode("Transferred")}
            />{" "}
            Transferred to a new account
          </label>
        </div>
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
        {isTransfer && (
          <>
            <hr style={{ margin: 0 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>Replacement account details</p>
            <div>
              <label style={{ display: "block", marginBottom: "0.25rem" }}>
                Account name
              </label>
              <input
                type="text"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.25rem" }}>
                Financial institution
              </label>
              <input
                type="text"
                value={targetFi}
                onChange={(e) => setTargetFi(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: "0.25rem" }}>
                  BSB (6 digits)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={targetBsb}
                  onChange={(e) =>
                    setTargetBsb(e.target.value.replace(/\D/g, ""))
                  }
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: "0.25rem" }}>
                  Account number
                </label>
                <input
                  type="text"
                  value={targetAcct}
                  onChange={(e) => setTargetAcct(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.25rem" }}>
                Opening date of replacement account
              </label>
              <input
                type="date"
                value={targetOpening}
                onChange={(e) => setTargetOpening(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
          </>
        )}
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#666" }}>
          Submitting will queue the QBCC TA2 notice and a Contracting Party
          Account Closing Notice for each contracted beneficiary. You can review
          and send them from the Notices to Send list.
        </p>
      </div>
    </BaseModal>
  );
}
