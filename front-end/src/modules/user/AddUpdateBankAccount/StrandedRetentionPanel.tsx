import { useCallback, useEffect, useState } from "react";
import { gql } from "@apollo/client";
import { apolloClient } from "@/network/apolloClient";
import {
  GetBankAccountPreflight,
  RelocateStrandedRetention,
} from "./AddUpdateBankAccount.function";
import BaseModal from "@/components/BaseModal";
import CustomButton from "@/components/CustomButton/CustomButton";
import { buttonType } from "@/shared/constant/general";
import { useRouter } from "next/navigation";
import { AppRoutes } from "@/shared/constant/appRoutes";

interface Props {
  bankAccountId: number;
  accountName?: string;
  accountStatus?: string;
  accountType?: string;
}

interface StrandedRow {
  id: number;
  amount?: number;
  status?: string;
  payment_id?: number;
  contract_id?: number;
  project_id?: number;
  project_name?: string;
  party_name?: string;
  reference?: string;
}

/**
 * Task #249 — Stranded retention panel.
 *
 * Surfaces `retention_details` rows that are still tied (via their
 * parent payment's `retention_account`) to a Transferred RTA after a
 * partial trust-account transfer. Without this panel users can leave
 * retention behind and forget about it, which silently blocks the
 * account from ever reaching a Closed state.
 *
 * Visible for any RTA that has at least one Retained retention row
 * pointed at it; emphasised when the account itself is Transferred.
 *
 * "Release" deep-links to the global Retention list filtered to this
 * payment's claim — releasing a retention is a multi-step claim flow
 * that lives there and isn't safe to fire from a quick button.
 *
 * "Move to..." opens a small RTA picker and calls the
 * `relocateStrandedRetention` mutation, which re-points the parent
 * payment's `retention_account` to the chosen Open RTA (atomically,
 * one payment at a time, all rows on a payment together).
 *
 * Styling note: only existing system utility classes are used here
 * (mb_1, mb_0_5, mt_0_5, invalid, pt_yellow, width_100). No new CSS
 * or hardcoded colors are introduced.
 */
export default function StrandedRetentionPanel({
  bankAccountId,
  accountName,
  accountStatus,
  accountType,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [rows, setRows] = useState<StrandedRow[]>([]);
  const [pickerRow, setPickerRow] = useState<StrandedRow | null>(null);
  const [eligible, setEligible] = useState<any[]>([]);
  const [destinationId, setDestinationId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const isRta = accountType === "Retention Trust Account";
  const isTransferred = accountStatus === "Transferred";

  const refresh = useCallback(async () => {
    if (!isRta || !bankAccountId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await GetBankAccountPreflight(bankAccountId);
    setRows((res?.preflight?.open_retention ?? []) as StrandedRow[]);
    setLoading(false);
  }, [bankAccountId, isRta]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Load eligible destination RTAs lazily, only when the picker opens.
  useEffect(() => {
    if (!pickerRow) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await apolloClient.query({
          query: gql`
            query FetchOpenRtasForRetentionMove(
              $payload: FetchAllBankAccountsInput!
            ) {
              fetchAllBankAccounts(payload: $payload) {
                data {
                  extendedBankAccounts {
                    bank_account_id
                    account_name
                    account_type
                    status
                  }
                }
                status
              }
            }
          `,
          variables: {
            payload: {
              keyword: null,
              page: 1,
              items_per_page: 500,
              account_type: "Retention Trust Account",
              status: "Open",
            },
          },
          fetchPolicy: "no-cache",
        });
        if (cancelled) return;
        const all =
          resp?.data?.fetchAllBankAccounts?.data?.extendedBankAccounts ?? [];
        setEligible(
          all.filter(
            (a: any) =>
              Number(a.bank_account_id) !== Number(bankAccountId) &&
              a.status === "Open" &&
              a.account_type === "Retention Trust Account"
          )
        );
      } catch {
        if (!cancelled) setEligible([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pickerRow, bankAccountId]);

  const handleMove = async () => {
    if (!pickerRow || !destinationId) return;
    setSubmitting(true);
    const result = await RelocateStrandedRetention({
      source_bank_account_id: bankAccountId,
      destination_bank_account_id: destinationId,
      retention_ids: [Number(pickerRow.id)],
    });
    setSubmitting(false);
    if (result?.ok) {
      setPickerRow(null);
      setDestinationId(null);
      refresh();
    }
  };

  const handleRelease = (row: StrandedRow) => {
    // Release flow lives in the retention list — that page already
    // gates on contract status / payment lifecycle and lets the user
    // generate the necessary pay-out claim.
    try {
      router.push(AppRoutes.USER_RETENTION_LIST);
    } catch {
      /* ignore */
    }
  };

  if (!isRta) return null;
  if (loading) return null;
  if (rows.length === 0) return null;

  return (
    <div id="stranded-retention-panel" className="mb_1">
      <div
        className="mb_0_5"
        style={{
          padding: "12px",
          border: "1px solid var(--pt-warning, #f5c46b)",
          borderRadius: 4,
        }}
      >
        <p className="mb_0_5">
          <strong>
            {isTransferred
              ? "Retention left behind on this Transferred account"
              : "Open retention on this account"}
          </strong>
        </p>
        <p className="mb_0_5">
          <small>
            {isTransferred ? (
              <>
                <span className="pt_yellow">Note:</span> {rows.length}{" "}
                retention row(s) are still anchored to{" "}
                <strong>{accountName ?? "this account"}</strong>. The account
                cannot be Closed until each is released or moved to another
                Retention Trust Account.
              </>
            ) : (
              <>
                <span className="pt_yellow">Note:</span> {rows.length} Retained
                retention row(s) are tied to this account. Release them or
                move them before closing.
              </>
            )}
          </small>
        </p>
        <table className="width_100 mt_0_5">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Retention</th>
              <th style={{ textAlign: "left" }}>Project</th>
              <th style={{ textAlign: "left" }}>Beneficiary</th>
              <th style={{ textAlign: "right" }}>Amount</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>#{r.id}</td>
                <td>{r.project_name ?? r.reference ?? "—"}</td>
                <td>{r.party_name ?? "—"}</td>
                <td style={{ textAlign: "right" }}>
                  ${Number(r.amount ?? 0).toFixed(2)}
                </td>
                <td style={{ textAlign: "right" }}>
                  <CustomButton
                    actionType="button"
                    buttonType={`${buttonType.OUTLINE_SECONDARY} ${buttonType.SMALL_BUTTON}`}
                    buttonName="Release"
                    onClick={() => handleRelease(r)}
                  />{" "}
                  <CustomButton
                    actionType="button"
                    buttonType={`${buttonType.OUTLINE_SECONDARY} ${buttonType.SMALL_BUTTON}`}
                    buttonName="Move to…"
                    onClick={() => {
                      setDestinationId(null);
                      setPickerRow(r);
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pickerRow && (
        <BaseModal
          modalId="move-stranded-retention"
          displayModal
          title="Move retention to another Retention Trust Account"
          firstButtonName="Cancel"
          secondButtonName={submitting ? "Moving…" : "Move retention"}
          disableSecondButton={submitting || !destinationId}
          onClose={() => {
            if (!submitting) {
              setPickerRow(null);
              setDestinationId(null);
            }
          }}
          onConfirm={() => {
            handleMove();
            return true;
          }}
        >
          <div>
            <p className="mb_0_5">
              <strong>Retention:</strong> #{pickerRow.id}
              {pickerRow.project_name ? ` — ${pickerRow.project_name}` : ""}
              {pickerRow.party_name ? ` (${pickerRow.party_name})` : ""}
            </p>
            <p className="mb_0_5">
              <strong>Amount:</strong> $
              {Number(pickerRow.amount ?? 0).toFixed(2)}
            </p>
            <p className="mb_1">
              <small>
                <span className="pt_yellow">Note:</span> All Retained rows on
                the same parent payment will move together — the
                retention_account field is single-valued per payment. If other
                rows on the payment shouldn't move, release them first.
              </small>
            </p>
            <label className="mb_0_5">
              <strong>Destination Retention Trust Account</strong>
            </label>
            <select
              className="width_100"
              value={destinationId ?? ""}
              onChange={(e) =>
                setDestinationId(Number(e.target.value) || null)
              }
            >
              <option value="">— Select destination —</option>
              {eligible.map((a) => (
                <option key={a.bank_account_id} value={a.bank_account_id}>
                  {a.account_name} (id {a.bank_account_id})
                </option>
              ))}
            </select>
            {eligible.length === 0 && (
              <small className="invalid">
                No other Open Retention Trust Accounts found. Open one before
                moving.
              </small>
            )}
          </div>
        </BaseModal>
      )}
    </div>
  );
}
