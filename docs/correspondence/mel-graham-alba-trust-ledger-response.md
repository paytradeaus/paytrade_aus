# ALBA Project — Trust Ledger Review (Signature Multi-Res Pty Ltd)

**Prepared for:** Mel Graham
**Project:** ALBA
**Trust account reviewed:** Project Trust Account (PTA) — Signature Multi-Res, NAB
**Bank statement used:** Alba Project Trust, NAB 084-004 43-681-2608 (27/03/2026 – 24/06/2026)

---

Hi Mel,

Thanks for flagging this. We've gone right through the ALBA trust ledger line by line and reconciled it against the NAB trust statement you supplied. The short version is reassuring: **no money is missing and the system has not double-counted anything.** There are three things worth your attention, set out below, along with your options and how to action each one.

---

## 1. The "duplicate-looking" entries are edits, not duplicates

The reversal-then-re-entry pairs you spotted (e.g. Traffic Control and APS Plumbing) are how the trust ledger handles a change to a figure. Because a trust ledger can never overwrite a posted entry, any edit is recorded as **reverse the old + post the new**, which always nets to a single live amount.

We confirmed each one nets to exactly one live entry:

- **$16,776.02 (APS Plumbing)** — paid and reconciled. One live payment.
- **$902.00 (Traffic Control)** — paid and reconciled. One live payment.

There is **no duplication** in any of these.

---

## 2. Two amounts are sitting in trust with no completed payment ("leftover" claims)

These are the two you may want to clean up. Both have a valid claim in the system, so they are **not** rogue trust entries — but neither has a completed payment, so the money is shown as still held in trust:

| Amount | Claim ref | Contractor | Claim status | Payment status |
|--------|-----------|------------|--------------|----------------|
| **$1,791.63** | 00070348 (claim 100082) | Traffic Control Innovations | Confirmed | A payment was entered then **deleted** — currently unpaid |
| **$3,760.35** | 00070538 (claim 100084) | Traffic Control Innovations | Confirmed | **No payment ever recorded** — unpaid |

Combined, these are **$5,551.98** held in trust — which is exactly the closing balance on the Traffic Control ledger, so the ledger is internally consistent.

**What to do depends on the real-world position:**

- **If these contractors have NOT been paid yet** → leave them as is and pay them through PayTrade when due. Nothing is wrong.
- **If they HAVE been paid outside PayTrade** → record the payment against the claim so the trust ledger matches the bank.
- **If the claims should not exist at all** (entered in error / duplicated work) → delete the claim, which removes the trust entry.

*How to action:* open the claim from the project's Claims list → use **Record Payment** (to pay or back-date a payment already made) or **Delete** (to remove a claim that shouldn't be there). If you'd like, we can do either for you once you confirm which applies to each.

---

## 3. The "$390,993.02 out of balance" at 30/05 — a recording-date timing difference

You were absolutely right that the end-of-May balance looked too high, and right that, in principle, if every payment is recorded in PayTrade on the date it actually happens, it should all line up. The reason it didn't is a **timing lag on one single payment.**

**The payment:** Timms, invoice **018277**, **$393,183.57**.

- The cash for this invoice **left the NAB trust account on 26/05** (the "AUTOMATIC DRAWING" and "TIMMS-INV18277" debits).
- In PayTrade, the **claim wasn't raised until 31/05** and the **payment wasn't recorded until 01/06**.
- However, the **trustee top-ups that funded it** ($389,991.92 + $21,905.50 + $48,801.28) were matched from the bank feed on the correct date, **26/05**.

So for the few days between 26/05 and 01/06, PayTrade had the money **in** but not yet **out** — overstating the trust by **exactly $390,993.02**. The moment the payment was entered on 01/06, the outflow landed and both sides came back into agreement:

| Date | PayTrade balance | Bank balance | Difference |
|------|-----------------:|-------------:|-----------:|
| 26/05 | $390,993.02 | $0.00 | +$390,993.02 |
| **31/05 (month end)** | **$1,883,290.81** | **$1,492,297.79** | **+$390,993.02** |
| 01/06 | $252,561.72 | $252,561.72 | **$0.00 — back in agreement** |

The figures reconcile to the cent: PayTrade's extra outflow on 01/06 ($393,183.57) less the bank's residual Timms GST payment on 01/06 ($2,190.55) = **$390,993.02**.

**This is a recording-date timing difference, not an error in the ledger or missing funds.**

### How to treat it at month end

This should be shown as a **reconciling item on the 31/05 trust reconciliation**, with a note explaining that it self-reverses. Suggested wording you can drop straight into the reconciliation:

> **Timing difference — Timms invoice 018277 ($393,183.57).**
> Funds left the trust bank account on 26/05/2026, but the claim was raised on 31/05/2026 and the payment recorded in PayTrade on 01/06/2026. As at 31/05/2026 month-end the trust ledger is therefore **$390,993.02 higher** than the bank statement. This difference **reverses on 01/06/2026** when the payment was recorded, bringing the ledger and bank back into agreement at **$252,561.72**. No funds are missing — the variance is solely the recording date of one payment.

**To avoid this in future:** record contractor payments (and raise the claim) on the date the cash actually moves at the bank. Because the bank feed auto-matches incoming top-ups immediately, any delay in entering the matching outgoing payment will temporarily inflate the trust balance in the same way.

---

## 4. One genuine issue to action — two duplicate withdrawals ($45,000)

Separately from the above, we did find **two genuinely duplicated withdrawals** with no offsetting reversal — these are real duplicates, not edits:

| Amount | Date | Notes |
|--------|------|-------|
| $20,000.00 | 04/06 | Duplicate of an existing withdrawal |
| $25,000.00 | 08/06 | Duplicate of an existing withdrawal |

These overstate the trust withdrawals by **$45,000 in total**.

### How this happened

Each of these is a single real debit at the bank — there is **one** $20,000 (04/06) and **one** $25,000 (08/06) on the NAB statement. The reason they appear twice in PayTrade is that the **bank statement was uploaded into bookkeeping a second time on 24/06**, which re-imported those two transactions. Each re-imported line was then matched to a second, duplicate withdrawal.

It slipped through because the dates were read differently on the two uploads — the first upload read 04/06 and 08/06 as **6 April** and **6 August**, while the 24/06 re-upload read them correctly as **4 June** and **8 June** — so the system saw them as different transactions rather than duplicates. (PayTrade matches one bank line to one payment, so the only way a second withdrawal could be matched was for a second bank line to exist.)

### How to self-remedy (creates the reversing journals and resolves it)

For **each** of the two duplicated transactions, in order:

1. **Unmatch the transaction** in bookkeeping (remove the match between the duplicate bank line and its payment).
2. **Exclude the transaction** in bookkeeping so the duplicate bank line is no longer treated as a real movement.
3. Go to the payments — the two payments that were attached to those lines will now show as **Unmatched**. **Delete** those two payments.

Deleting the payments posts the **reversing journals** automatically, which removes the $45,000 overstatement and brings the trust ledger back into agreement with the bank. We're happy to do this with you, or to action it on your confirmation.

> **Tip for future uploads:** before importing a bank statement, check it isn't one that's already been brought in. A re-upload of an earlier statement will re-create transactions that are already matched.

---

## Your options at a glance

| Item | Status | Recommended action |
|------|--------|--------------------|
| Reversal/re-entry pairs | ✅ Correct — edits, not duplicates | None |
| $1,791.63 + $3,760.35 held in trust | ⚠️ Confirmed claims, unpaid | Pay, record existing payment, or delete claim — depending on real position |
| $390,993.02 at 30/05 | ✅ Timing difference, self-reverses 01/06 | Note as a reconciling item at month end (wording above) |
| $45,000 duplicate withdrawals | ❌ Genuine duplicates (re-uploaded statement) | Unmatch → exclude the duplicate bank lines → delete the two now-unmatched payments (posts reversing journals) |

Happy to jump on a quick call to walk through any of this, and to action the deletions / payment records for you once you confirm how you'd like each handled.

Kind regards,

---
*Review based on the live PayTrade trust ledger and the NAB Alba Project Trust statement to 24/06/2026.*
