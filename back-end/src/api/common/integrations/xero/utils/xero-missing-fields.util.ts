/**
 * Shared builder for "Missing mandatory fields" sync-log entries.
 *
 * Every Xero → Pay Trade import path used to write the same opaque
 * `error_message: 'Missing mandatory fields'` with no `notification` /
 * `information_required` populated, leaving admins to guess which fields
 * were blank and where to fix them. This helper:
 *
 *  1. Joins the missing field labels into a readable error message.
 *  2. Sets a `notification` (one-line call-to-action — what to click next).
 *  3. Builds an `information_required` body listing each missing field
 *     with a per-field "where to find it in Xero / Pay Trade" hint.
 *
 * Field labels passed in MUST already be the user-facing labels (e.g.
 * "Address", not "client_supplier_address") so the message is readable
 * without further translation. Each call site builds its own missing-
 * label array from its own validators.
 */

export type XeroRecordType = 'contact' | 'account' | 'contract' | 'project';

const FIELD_HINTS: Record<XeroRecordType, Record<string, string>> = {
  contact: {
    Name: 'In Xero, open the contact and check the Contact name field at the top.',
    Address:
      "In Xero, open the contact → Edit → Postal address. Pay Trade also needs Country, Region, and a recognised street address that resolves to a map location.",
    Country:
      "Set the contact's Country in Xero (Edit → Postal address).",
    Region: 'Set the State / Region in Xero (Edit → Postal address).',
    'Place ID':
      "Pay Trade needs the contact's address to resolve to a map location. Re-enter the Postal address in Xero exactly as Google Maps would format it.",
    Latitude:
      "Pay Trade needs the contact's address to resolve to a map location. Re-enter the Postal address in Xero exactly as Google Maps would format it.",
    Longitude:
      "Pay Trade needs the contact's address to resolve to a map location. Re-enter the Postal address in Xero exactly as Google Maps would format it.",
    Phone: 'Add a phone number to the contact in Xero (Edit → Phone).',
    Email: 'Add an email address to the contact in Xero (Edit → Email).',
    Type: 'Pay Trade could not infer whether this contact is a Client or Supplier. Set the contact type in Xero (Customer / Supplier toggle).',
    Status:
      "Set the contact's status in Xero.",
    'Related entity':
      'Pay Trade could not match this contact to a project or contract. Tag the contact in Xero with the project tracking category.',
    'Entity type':
      'Pay Trade could not classify this contact (Individual vs Organisation). Set the contact type in Xero.',
  },
  account: {
    'Account type':
      'Pay Trade needs to know if this is a Cash Account, Project Trust, or Retention Trust account. Set this when importing in Pay Trade.',
    'Account name':
      'Set the bank account name in Xero (Accounting → Bank accounts → Edit).',
    'Financial institution': 'Set the bank name on the account in Xero.',
    'Account number': 'Set the account number on the bank account in Xero.',
    'BSB number': 'Set the BSB number on the bank account in Xero.',
    'Opening date': 'Set the opening date when importing in Pay Trade.',
    'Delegate powers':
      'Choose Yes / No for delegate powers when importing in Pay Trade.',
    'Associated cash account':
      'Trust accounts must be linked to a cash account when importing in Pay Trade.',
    Trustee: 'Trust accounts must have a trustee when importing in Pay Trade.',
    Projects:
      'Trust accounts must be linked to at least one project when importing in Pay Trade.',
    'Client / supplier':
      'Project Trust accounts must reference a client when importing in Pay Trade.',
    'Contract date':
      'Project Trust accounts need a contract date when importing in Pay Trade.',
    'Practical completion date':
      'Project Trust accounts need a practical completion date when importing in Pay Trade.',
    'First sub-contract date':
      'Project Trust accounts need the first sub-contract date when importing in Pay Trade.',
    'Contract value':
      'Project Trust accounts need a contract value when importing in Pay Trade.',
  },
  contract: {
    'Contract name': 'Set the contract name in Xero or Pay Trade.',
    'Client / supplier role':
      'Choose whether this contract is for a Client or Supplier when importing in Pay Trade.',
    'Contract status':
      'Set the contract status (Active / Closed / etc.) when importing in Pay Trade.',
    'Contract date': 'Set the contract date when importing in Pay Trade.',
    Project: 'Link the contract to a project when importing in Pay Trade.',
    'Project role':
      'Set the project role on the contract when importing in Pay Trade.',
    'Client / supplier':
      'Set the client or supplier on the contract when importing in Pay Trade.',
    'Client / supplier type':
      'Set whether the counterparty is an Individual or Organisation.',
    'Related entity':
      'Pay Trade could not match this contract to a project tracking category. Tag the contract in Xero.',
    'Retention type': 'Set the retention type when importing in Pay Trade.',
    'Payment terms': 'Set payment terms when importing in Pay Trade.',
    'Initial contract sum':
      'Set the initial contract sum when importing in Pay Trade.',
    'Contract start date':
      'Set the contract start date when importing in Pay Trade.',
    'Defect liability end date':
      'Set the defect liability end date when importing in Pay Trade.',
  },
  project: {
    'Project name':
      'Set the project name in Xero or when importing in Pay Trade.',
    'Project role':
      'Choose the project role (Head contractor / Sub-contractor / etc.) when importing in Pay Trade.',
    'Project date': 'Set the project date when importing in Pay Trade.',
    'Project description':
      'Add a description to the project when importing in Pay Trade.',
    'Site address':
      'Set the site address when importing in Pay Trade — it must resolve to a map location.',
    Country: 'Set the project country when importing in Pay Trade.',
    Region: 'Set the project region/state when importing in Pay Trade.',
    'Place ID':
      'The site address must resolve to a recognised map location. Re-enter the address as Google Maps would format it.',
    Latitude:
      'The site address must resolve to a recognised map location. Re-enter the address as Google Maps would format it.',
    Longitude:
      'The site address must resolve to a recognised map location. Re-enter the address as Google Maps would format it.',
    'Head contract sum':
      'Set the head contract sum when importing in Pay Trade.',
    'Retention type': 'Set the retention type when importing in Pay Trade.',
    'Number of units':
      'Set the number of units when importing in Pay Trade.',
    'PTA eligibility':
      'Set Project Trust Account eligibility when importing in Pay Trade.',
    'RTA eligibility':
      'Set Retention Trust Account eligibility when importing in Pay Trade.',
    'Project status': 'Set the project status when importing in Pay Trade.',
  },
};

const FIX_LOCATION: Record<XeroRecordType, string> = {
  contact:
    'Update the contact in Xero, then click Retry import to re-process this webhook.',
  account:
    'Open this bank account in Pay Trade, complete the missing fields, then re-run the import.',
  contract:
    'Open this contract in Pay Trade, complete the missing fields, then re-run the import.',
  project:
    'Open this project in Pay Trade, complete the missing fields, then re-run the import.',
};

/**
 * Builds the trio of fields ({error_message, notification,
 * information_required}) used by the sync-log details screen so a non-
 * technical admin can read what is wrong and act on it.
 *
 * @param recordType Which Xero record the import is for. Drives the
 *   per-field hint table and the "where to fix it" call-to-action.
 * @param recordName Display name (Xero contact name / account name /
 *   contract name / project name) so the message can quote the record.
 * @param missingLabels User-facing labels for the fields that failed
 *   the validator. Must already be friendly strings such as "Address"
 *   or "Account number" — this helper does no further translation.
 * @param opts.extraNote Optional trailing parenthetical note (used by
 *   the contact path to add "(email also missing)" without lumping
 *   email into the hard-fail list).
 */
export function buildMissingFieldsLog(
  recordType: XeroRecordType,
  recordName: string | null | undefined,
  missingLabels: string[],
  opts: { extraNote?: string; contactStatus?: string } = {},
): {
  error_message: string;
  notification: string;
  information_required: string;
} {
  const name = recordName ? `"${recordName}"` : 'this record';
  const list = missingLabels.length
    ? missingLabels.join(', ')
    : '(unknown — see Xero record)';
  const error_message = `Missing mandatory fields: ${list}${
    opts.extraNote ? ` ${opts.extraNote}` : ''
  }`;
  const notification = FIX_LOCATION[recordType];
  const hints = FIELD_HINTS[recordType] || {};
  // Task #283 — Only mention "archived contacts cannot be imported" in
  // the Status hint when the contact is actually ARCHIVED in Xero. The
  // old static wording made every Active-contact failure look like an
  // archive problem, which sent debugging down the wrong path.
  const contactStatusUpper = String(opts.contactStatus || '').toUpperCase();
  const isArchived = contactStatusUpper === 'ARCHIVED';
  const lines = missingLabels.map((label) => {
    if (recordType === 'contact' && label === 'Status' && isArchived) {
      return `• Status: Activate the contact in Xero — archived contacts cannot be imported.`;
    }
    const hint = hints[label];
    return hint ? `• ${label}: ${hint}` : `• ${label}`;
  });
  const information_required = lines.length
    ? `Pay Trade could not import ${name} because the following fields are blank or invalid:\n${lines.join('\n')}`
    : `Pay Trade could not import ${name} because some required fields are missing in Xero.`;
  return { error_message, notification, information_required };
}
