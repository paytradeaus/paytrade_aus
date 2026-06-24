import { parseBankTxnDate } from './transactions-date.util';

const iso = (d: Date) => d.toISOString().slice(0, 10);

describe('parseBankTxnDate', () => {
  it('parses ANZ single-digit-day, day-first dates correctly', () => {
    // Regression: "4/06/2026" must be 4 June, not 6 April.
    expect(iso(parseBankTxnDate('4/06/2026'))).toBe('2026-06-04');
    expect(iso(parseBankTxnDate('8/06/2026'))).toBe('2026-06-08');
  });

  it('parses zero-padded day-first dates correctly', () => {
    expect(iso(parseBankTxnDate('04/06/2026'))).toBe('2026-06-04');
    expect(iso(parseBankTxnDate('08/06/2026'))).toBe('2026-06-08');
  });

  it('treats slash dates as day-first (Australian), never US month-first', () => {
    expect(iso(parseBankTxnDate('06/04/2026'))).toBe('2026-04-06');
    expect(iso(parseBankTxnDate('13/05/2026'))).toBe('2026-05-13');
  });

  it('supports dash separators and ISO format', () => {
    expect(iso(parseBankTxnDate('4-06-2026'))).toBe('2026-06-04');
    expect(iso(parseBankTxnDate('2026-06-04'))).toBe('2026-06-04');
  });

  it('stores the same calendar date regardless of zero-padding (dedup parity)', () => {
    expect(iso(parseBankTxnDate('4/06/2026'))).toBe(
      iso(parseBankTxnDate('04/06/2026')),
    );
  });

  it('passes Date instances through unchanged', () => {
    const d = new Date('2026-06-04T00:00:00.000Z');
    expect(parseBankTxnDate(d)).toBe(d);
  });

  it('returns an Invalid Date for empty/garbage input', () => {
    expect(isNaN(parseBankTxnDate('').getTime())).toBe(true);
    expect(isNaN(parseBankTxnDate(null).getTime())).toBe(true);
    expect(isNaN(parseBankTxnDate('not-a-date').getTime())).toBe(true);
  });

  it('rejects out-of-range / rolled-over day or month values', () => {
    expect(isNaN(parseBankTxnDate('31/02/2026').getTime())).toBe(true);
    expect(isNaN(parseBankTxnDate('00/06/2026').getTime())).toBe(true);
    expect(isNaN(parseBankTxnDate('13/13/2026').getTime())).toBe(true);
  });

  it('parses numeric dates as UTC midnight (timezone-stable storage)', () => {
    const d = parseBankTxnDate('4/06/2026');
    expect(d.toISOString()).toBe('2026-06-04T00:00:00.000Z');
  });
});
