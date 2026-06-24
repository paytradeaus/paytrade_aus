/**
 * Build a UTC `Date` from numeric Y/M/D parts, rejecting out-of-range or
 * rolled-over values (e.g. 31 February).
 */
function makeUtcDate(year: string, month: string, day: string): Date {
  const y = Number(year);
  const mo = Number(month);
  const d = Number(day);
  if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) return new Date(NaN);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return new Date(NaN);
  return dt;
}

/**
 * Parse a bank-export date string into a UTC `Date`.
 *
 * Australian bank exports (ANZ, NAB, CBA, Westpac) are day-first and
 * frequently ship single-digit day/month values (e.g. `4/06/2026`). The
 * native `new Date('4/06/2026')` parser treats slash-separated dates as US
 * month-first, silently turning `4/06/2026` into 6 April instead of 4 June.
 * That month shift previously caused the same real transaction to be stored
 * under two different dates across uploads, defeating the amount+date
 * duplicate check.
 *
 * We therefore parse explicitly: ISO (`YYYY-MM-DD` / `YYYY/MM/DD`) and
 * day-first numeric (`D/M/YYYY` / `DD-MM-YYYY`, 1–2 digit day & month), and
 * only fall back to the native parser for genuinely unrecognised shapes
 * (e.g. textual months).
 *
 * @returns a `Date` (which may be `Invalid Date` when unparseable — callers
 *          already guard with `isNaN(date.getTime())`).
 */
export function parseBankTxnDate(raw: string | Date | null | undefined): Date {
  if (raw instanceof Date) return raw;
  const s = (raw ?? '').toString().trim();
  if (!s) return new Date(NaN);

  // ISO: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) return makeUtcDate(isoMatch[1], isoMatch[2], isoMatch[3]);

  // Day-first: D/M/YYYY or D-M-YYYY (1–2 digit day & month)
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) return makeUtcDate(dmyMatch[3], dmyMatch[2], dmyMatch[1]);

  // Last resort for formats not covered above (e.g. textual months).
  return new Date(s);
}
