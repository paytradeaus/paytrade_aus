// Australian BSBs are always 6 digits. Several `bsb_number` columns are stored
// as `numeric` in Postgres so a leading zero is structurally lost on write
// (e.g. NAB BSB "084004" persists as 84004, commonly arriving via the
// Xero → PT bank-account sync). Zero-pad to 6 on read so callers and the
// frontend always see the canonical 6-digit value and validators that
// require "must be 6 digits" pass on save.
export function padBsb6(
  value: number | string | null | undefined,
): string | null {
  if (value == null) return null;
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return null;
  return digits.padStart(6, '0').slice(0, 6);
}
