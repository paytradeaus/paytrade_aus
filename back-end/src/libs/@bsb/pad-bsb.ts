// Australian BSBs are always 6 digits. Task #258 promoted the
// `bank_accounts.bsb_number` and `bank_accounts.closing_target_bsb`
// columns from `int` to `varchar(6)` so leading zeros survive a
// round-trip through the database. This helper is now retained as a
// defensive no-op: it coerces a number/string/null input to a canonical
// 6-digit string (or null), and continues to guard the
// `xero_bank_account_details.bsb_number` mirror column (still `int`)
// and any caller that hands us a raw number from a CSV, Xero payload,
// or legacy code path. On values that are already a 6-digit string it
// returns them unchanged.
export function padBsb6(
  value: number | string | null | undefined,
): string | null {
  if (value == null) return null;
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return null;
  return digits.padStart(6, '0').slice(0, 6);
}
