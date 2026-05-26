/**
 * Task #283 — regression coverage for the Xero new-contact webhook
 * "Missing mandatory fields" fix.
 *
 *   1. `buildContactPayloadFromXero` shapes a live Xero contact into
 *      the PT payload (Customer→Client, Supplier→Supplier, POBOX-first
 *      address, MOBILE-first phone, Active→'Completed', UI defaults,
 *      batchPayments→account_details with BSB split).
 *   2. `collectMissingMandatoryFields({ webhookSource: true })` skips
 *      the Pay Trade-only map / UI fields Xero never sends, so an
 *      Active complete contact reports ZERO missing fields.
 *   3. `buildMissingFieldsLog` only emits the "archived" Status hint
 *      when `contactStatus = 'ARCHIVED'`; ACTIVE shows the neutral hint.
 */
import { XeroContactsService } from '../xero-contacts.service';
import { buildMissingFieldsLog } from '../../utils/xero-missing-fields.util';

function newService(): XeroContactsService {
  // The constructor only stores injected deps and constructs a
  // XeroClient (which doesn't actually network until used). We only
  // exercise pure-data methods, so empty mocks are sufficient.
  return new (XeroContactsService as any)(
    {}, // xeroIntegrationDetails repo
    {}, // xeroContactDetails repo
    {}, // clientSuppliersDetails repo
    {}, // integrationDetails repo
    {}, // xeroService
    {}, // clientSuppliersDetailsService
  );
}

describe('Task #283 — XeroContactsService.buildContactPayloadFromXero', () => {
  const service = newService();

  it('shapes an Active Customer contact with POBOX/MOBILE preference', () => {
    const xeroContact = {
      contactID: 'guid-1',
      name: 'Acme Pty Ltd',
      contactStatus: 'ACTIVE',
      isCustomer: true,
      isSupplier: false,
      emailAddress: 'ops@acme.example',
      addresses: [
        { addressType: 'STREET', addressLine1: '1 Street Rd', country: 'AU' },
        { addressType: 'POBOX', addressLine1: 'PO Box 99', country: 'AU' },
      ],
      phones: [
        { phoneType: 'DEFAULT', phoneNumber: '02 9000 0000' },
        { phoneType: 'MOBILE', phoneNumber: '0400 000 000' },
      ],
      batchPayments: {
        bankAccountName: 'Acme Operating',
        bankAccountNumber: '06200012345678',
      },
    };

    const payload = service.buildContactPayloadFromXero(xeroContact as any, 42);

    expect(payload).toMatchObject({
      company_id: 42,
      client_supplier_name: 'Acme Pty Ltd',
      business_name: 'Acme Pty Ltd',
      client_supplier_type: 'Client',
      client_supplier_status: 'Completed',
      related_entity: 'No',
      entity_type: 'Organisation',
      client_supplier_address: 'PO Box 99',
      country: 'AU',
      client_phone_no: '0400 000 000',
      client_email_id: 'ops@acme.example',
    });
    // Map fields are intentionally null — Xero never sends them.
    expect(payload.place_id).toBeNull();
    expect(payload.region).toBeNull();
    expect(payload.latitude).toBeNull();
    expect(payload.longitude).toBeNull();
    // batchPayments → split BSB + account number
    expect(payload.account_details).toHaveLength(1);
    expect(payload.account_details[0]).toEqual({
      account_name: 'Acme Operating',
      bsb_number: '062000',
      account_number: '12345678',
    });
  });

  it('falls back to STREET address and DEFAULT phone, infers Supplier', () => {
    const payload = service.buildContactPayloadFromXero(
      {
        name: 'Pipe Supplies',
        contactStatus: 'ACTIVE',
        isCustomer: false,
        isSupplier: true,
        addresses: [
          {
            addressType: 'STREET',
            addressLine1: '12 Industrial Ave',
            country: 'AU',
          },
        ],
        phones: [{ phoneType: 'DEFAULT', phoneNumber: '07 3000 0000' }],
      } as any,
      7,
    );
    expect(payload.client_supplier_type).toBe('Supplier');
    expect(payload.client_supplier_address).toBe('12 Industrial Ave');
    expect(payload.client_phone_no).toBe('07 3000 0000');
    expect(payload.account_details).toEqual([]);
  });

  it('returns null when contact itself is null', () => {
    expect(service.buildContactPayloadFromXero(null, 1)).toBeNull();
  });
});

describe('Task #283 — collectMissingMandatoryFields(webhookSource)', () => {
  const service = newService();

  it('returns zero missing for an Active complete contact payload', () => {
    const payload = service.buildContactPayloadFromXero(
      {
        name: 'Acme',
        contactStatus: 'ACTIVE',
        isCustomer: true,
        emailAddress: 'a@a',
        addresses: [
          { addressType: 'POBOX', addressLine1: 'PO 1', country: 'AU' },
        ],
        phones: [{ phoneType: 'MOBILE', phoneNumber: '0400000000' }],
      } as any,
      1,
    );
    const missing = service.collectMissingMandatoryFields(payload, {
      webhookSource: true,
    });
    expect(missing).toEqual([]);
  });

  it('reports only Phone when phone is missing — does not list Place ID / Region / Lat / Lng', () => {
    const payload = service.buildContactPayloadFromXero(
      {
        name: 'Acme',
        contactStatus: 'ACTIVE',
        isCustomer: true,
        emailAddress: 'a@a',
        addresses: [
          { addressType: 'POBOX', addressLine1: 'PO 1', country: 'AU' },
        ],
        phones: [],
      } as any,
      1,
    );
    const missing = service.collectMissingMandatoryFields(payload, {
      webhookSource: true,
    });
    expect(missing).toEqual(['Phone']);
    expect(missing).not.toContain('Place ID');
    expect(missing).not.toContain('Region');
    expect(missing).not.toContain('Latitude');
    expect(missing).not.toContain('Longitude');
    expect(missing).not.toContain('Related entity');
    expect(missing).not.toContain('Entity type');
  });

  it('without webhookSource: still flags the Pay Trade-only fields (manual-import gate)', () => {
    const payload = service.buildContactPayloadFromXero(
      {
        name: 'Acme',
        contactStatus: 'ACTIVE',
        isCustomer: true,
        emailAddress: 'a@a',
        addresses: [
          { addressType: 'POBOX', addressLine1: 'PO 1', country: 'AU' },
        ],
        phones: [{ phoneType: 'MOBILE', phoneNumber: '0400000000' }],
      } as any,
      1,
    );
    const missing = service.collectMissingMandatoryFields(payload, {});
    expect(missing).toEqual(
      expect.arrayContaining(['Place ID', 'Region', 'Latitude', 'Longitude']),
    );
  });
});

describe('Task #283 — buildMissingFieldsLog Status hint gating', () => {
  it('shows neutral Status hint when contact is Active', () => {
    const log = buildMissingFieldsLog('contact', 'Acme', ['Status'], {
      contactStatus: 'ACTIVE',
    });
    expect(log.information_required).toContain("Status: Set the contact's status");
    expect(log.information_required).not.toContain('archived');
  });

  it('shows the archived-specific hint only when contactStatus is ARCHIVED', () => {
    const log = buildMissingFieldsLog('contact', 'Acme', ['Status'], {
      contactStatus: 'ARCHIVED',
    });
    expect(log.information_required).toContain(
      'archived contacts cannot be imported',
    );
  });

  it('treats missing contactStatus as non-archived', () => {
    const log = buildMissingFieldsLog('contact', 'Acme', ['Status']);
    expect(log.information_required).not.toContain('archived');
  });
});
