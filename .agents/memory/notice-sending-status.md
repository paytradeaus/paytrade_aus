---
name: Notice 'Sending' status is a normal delegated in-flight state
description: What notice_details status 'Sending' means and how status monitors must treat it.
---
- **Rule:** `notice_details.status='Sending'` means a Paid-delegated QBCC notice was emailed to PayTrade's delegated-notices inbox and awaits an admin to lodge it with QBCC and mark it Sent. It is NOT an error state.
- **Why:** the system-status checker and AI overdue-notices inspection flagged ANY Sending notice as critical instantly, so users saw a false "stuck in Sending" alert seconds after generating an audit.
- **Update (July 2026):** TA5 nil-return notices are NO LONGER auto-generated — BIFOLA Act 2024 (from 1 July 2024) removed routine account-review obligations; QBCC only directs reviews case-by-case. `triggerAuditNotices` now logs and skips on nil_return. Compliance seed text still references the old "engage an auditor every 12 months"/TA5 regime — pending product decision.
- **How to apply:** any monitor over notice statuses must give Sending a grace window (72h, anchored on updated_on — an approximation since any row update resets it, which can only delay an alert) before calling it stuck. Admin marks Sent via the isAdmin status-update path in notices.service.
