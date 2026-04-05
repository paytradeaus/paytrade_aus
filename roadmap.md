# PayTrade Roadmap

## Notice System — Automated Trigger Flows

The following notice types now have full template infrastructure (email templates, data assembly, PDF generation, QBCC coordinate mapping) but do not yet have automated trigger handlers. They currently support manual generation only.

### Supplier S18C Project Trust Account Notice
- **Business Event**: Trust account is transferred to a new financial institution (project account).
- **Trigger Method Needed**: New handler in `notices.service.ts` (e.g., `handleTriggerAccountTransferNotices`).
- **Data Required**: Previous account details (BSB, account number, institution name), new account details, transfer effective date.
- **Pattern**: Follows the S23 Project flow with additional "previous account" fields.

### Supplier S18C Retention Trust Account Notice
- **Business Event**: Retention trust account is transferred to a new financial institution.
- **Trigger Method Needed**: Same handler as S18C Project, branching on account type.
- **Data Required**: Same as S18C Project but for the retention account.
- **Pattern**: Follows the S23 Retention flow with additional "previous account" fields.

### Contracting Party Account Closing Notice
- **Business Event**: A trust account is being closed and the contracting party must be notified.
- **Trigger Method Needed**: New handler (e.g., `handleTriggerAccountClosingNotices`).
- **Data Required**: Account details, closure reason, closure date, contracting party contact info.
- **Pattern**: Follows the S18B (Client) notice flow.

### QBCC TA2 Account Closing Notice
- **Business Event**: A project trust account is closed or changed, requiring QBCC notification via the TA2 form.
- **Trigger Method Needed**: Same account closing handler, with QBCC-specific branch.
- **Data Required**: Trustee details, account before/after closure, declaration fields. Generates a filled QBCC TA2 PDF via write-to-image.
- **Pattern**: Follows the QBCC TA1 Project flow with closure-specific fields mapped to TA2 coordinates.

### QBCC TA2 Retention Account Closing Notice
- **Business Event**: A retention trust account is closed or changed, requiring QBCC notification.
- **Trigger Method Needed**: Same account closing handler, retention branch.
- **Data Required**: Same as TA2 Account Closing but for retention accounts.
- **Pattern**: Follows the QBCC TA1 Retention flow with closure-specific fields.

### Implementation Notes
- All five types share the "account closure/transfer" business event, so a single new handler method with branching logic is the recommended approach.
- The handler should be triggered from the bank account management UI when a user initiates an account closure or transfer.
- Consider adding an `account_closure_events` table or status field on `bank_accounts` to track closure state and drive the trigger logic.
- Email sending follows the existing `notice-to-client-supplier` template pattern.

## Dynamic Pricing Table (Task #1 — In Progress)
- Update the features table on the frontend to use dynamic pricing data from the backend API instead of hardcoded values.
