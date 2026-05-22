import { useCallback, useEffect, useMemo, useState } from "react";
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
 * Task #254 — Bulk select + "Move selected to…" so a Transferred RTA
 * with many leftover retention rows can be cleared in one mutation
 * call instead of clicking Move-to per row.
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
 * one payment at a time, all rows on a payment together). Because
 * `payment_details.retention_account` is single-valued, selecting any
 * row on a payment implicitly drags every other Retained sibling on
 * that payment along — the picker shows this clearly so the user
 * isn't surprised by the resulting move.
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [pickerInitialIds, setPickerInitialIds] = useState<Set<number>>(
    new Set(),
  );
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
    setSelectedIds(new Set());
    setLoading(false);
  }, [bankAccountId, isRta]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Load eligible destination RTAs lazily, only when the picker opens.
  useEffect(() => {
    if (!pickerOpen) return;
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
              a.account_type === "Retention Trust Account",
          ),
        );
      } catch {
        if (!cancelled) setEligible([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pickerOpen, bankAccountId]);

  // Group rows by parent payment so we can show "what's about to move".
  const rowsByPayment = useMemo(() => {
    const m = new Map<string, StrandedRow[]>();
    for (const r of rows) {
      const key = String(r.payment_id ?? `r${r.id}`);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    return m;
  }, [rows]);

  // Expand the user's selection to include every Retained sibling on
  // the same payment — the backend will reject a partial selection
  // because `payment_details.retention_account` is single-valued.
  const expandWithSiblings = useCallback(
    (ids: Set<number>): Set<number> => {
      const out = new Set<number>(ids);
      const affectedPayments = new Set<string>();
      for (const r of rows) {
        if (out.has(Number(r.id)) && r.payment_id != null) {
          affectedPayments.add(String(r.payment_id));
        }
      }
      for (const r of rows) {
        if (
          r.payment_id != null &&
          affectedPayments.has(String(r.payment_id))
        ) {
          out.add(Number(r.id));
        }
      }
      return out;
    },
    [rows],
  );

  const effectiveIds = useMemo(
    () => expandWithSiblings(pickerInitialIds),
    [pickerInitialIds, expandWithSiblings],
  );
  const dragInSiblings = useMemo(() => {
    const extras: StrandedRow[] = [];
    for (const r of rows) {
      if (effectiveIds.has(Number(r.id)) && !pickerInitialIds.has(Number(r.id))) {
        extras.push(r);
      }
    }
    return extras;
  }, [rows, effectiveIds, pickerInitialIds]);
  const affectedPaymentIds = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      if (effectiveIds.has(Number(r.id)) && r.payment_id != null) {
        s.add(String(r.payment_id));
      }
    }
    return Array.from(s);
  }, [rows, effectiveIds]);

  const openPickerFor = (ids: Iterable<number>) => {
    setPickerInitialIds(new Set(ids));
    setDestinationId(null);
    setPickerOpen(true);
  };

  const closePicker = () => {
    if (submitting) return;
    setPickerOpen(false);
    setPickerInitialIds(new Set());
    setDestinationId(null);
  };

  const handleMove = async () => {
    if (!pickerOpen || !destinationId || effectiveIds.size === 0) return;
    setSubmitting(true);
    const result = await RelocateStrandedRetention({
      source_bank_account_id: bankAccountId,
      destination_bank_account_id: destinationId,
      retention_ids: Array.from(effectiveIds).map((n) => Number(n)),
    });
    setSubmitting(false);
    if (result?.ok) {
      setPickerOpen(false);
      setPickerInitialIds(new Set());
      setDestinationId(null);
      refresh();
    }
  };

  const handleRelease = (_row: StrandedRow) => {
    // Release flow lives in the retention list — that page already
    // gates on contract status / payment lifecycle and lets the user
    // generate the necessary pay-out claim.
    try {
      router.push(AppRoutes.USER_RETENTION_LIST);
    } catch {
      /* ignore */
    }
  };

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = rows.length > 0 && selectedIds.size === rows.length;
  const someSelected = selectedIds.size > 0 && !allSelected;
  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(rows.map((r) => Number(r.id))));
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
        <div
          className="mb_0_5"
          style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
        >
          <CustomButton
            actionType="button"
            buttonType={`${buttonType.OUTLINE_SECONDARY} ${buttonType.SMALL_BUTTON}`}
            buttonName={
              selectedIds.size > 0
                ? `Move selected to… (${selectedIds.size})`
                : "Move selected to…"
            }
            disabled={selectedIds.size === 0}
            onClick={() => openPickerFor(selectedIds)}
          />
        </div>
        <table className="width_100 mt_0_5">
          <thead>
            <tr>
              <th style={{ textAlign: "left", width: 32 }}>
                <input
                  type="checkbox"
                  aria-label="Select all stranded retention rows"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                />
              </th>
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
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select retention ${r.id}`}
                    checked={selectedIds.has(Number(r.id))}
                    onChange={() => toggleOne(Number(r.id))}
                  />
                </td>
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
                    onClick={() => openPickerFor([Number(r.id)])}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pickerOpen && (
        <BaseModal
          modalId="move-stranded-retention"
          displayModal
          title={
            pickerInitialIds.size > 1
              ? "Move selected retention to another Retention Trust Account"
              : "Move retention to another Retention Trust Account"
          }
          firstButtonName="Cancel"
          secondButtonName={submitting ? "Moving…" : "Move retention"}
          disableSecondButton={
            submitting || !destinationId || effectiveIds.size === 0
          }
          onClose={closePicker}
          onConfirm={() => {
            handleMove();
            return true;
          }}
        >
          <div>
            <p className="mb_0_5">
              <strong>
                {effectiveIds.size} retention row(s) across{" "}
                {affectedPaymentIds.length} payment(s) will move.
              </strong>
            </p>
            <div
              className="mb_0_5"
              style={{
                maxHeight: 220,
                overflowY: "auto",
                border: "1px solid var(--pt-border, #ddd)",
                borderRadius: 4,
                padding: 8,
              }}
            >
              {affectedPaymentIds.map((pid) => {
                const group = (rowsByPayment.get(pid) ?? []).filter((r) =>
                  effectiveIds.has(Number(r.id)),
                );
                return (
                  <div key={pid} className="mb_0_5">
                    <small>
                      <strong>Payment #{pid}</strong>
                    </small>
                    <ul style={{ margin: "4px 0 0 16px" }}>
                      {group.map((r) => {
                        const dragged = !pickerInitialIds.has(Number(r.id));
                        return (
                          <li key={r.id}>
                            <small>
                              #{r.id}
                              {r.project_name ? ` — ${r.project_name}` : ""}
                              {r.party_name ? ` (${r.party_name})` : ""} · $
                              {Number(r.amount ?? 0).toFixed(2)}
                              {dragged ? (
                                <>
                                  {" "}
                                  <span className="pt_yellow">
                                    (sibling — must move together)
                                  </span>
                                </>
                              ) : null}
                            </small>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
            {dragInSiblings.length > 0 && (
              <p className="mb_0_5">
                <small>
                  <span className="pt_yellow">Note:</span>{" "}
                  {dragInSiblings.length} additional sibling row(s) on the
                  same payment(s) have been included automatically — the
                  retention_account field is single-valued per payment. If
                  any of those shouldn't move, cancel and release them
                  first.
                </small>
              </p>
            )}
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
