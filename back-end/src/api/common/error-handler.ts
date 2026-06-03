import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

const logger = new PaytradeLogger('ERROR_HANDLER');

function safeStringify(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch {
    if (obj?.message) return obj.message;
    return String(obj);
  }
}

export async function handleError(error): Promise<string> {
  return new Promise(async (resolve, reject) => {
    var errorMessage = '';
    // Demoted to WARN — `logger.log` writes [SUCCESS] which was misleading
    // for raw error payloads being processed by the handler.
    logger.warn(`error: ${safeStringify(error)}`);
    if (error.detail) {
      const matchUnique = error.detail.match(
        /Key \(([^)]+)\)=\([^)]+\) already exists./,
      );
      const matchCheck = error.detail.match(/constraint "([^"]+)"/);
      const matchNull = error.detail.match(/column "([^"]+)"/);
      const matchLengthExceeded = error.detail.match(
        /value too long for type character varying\(\d+\) in column "([^"]+)"/,
      );
      if (matchLengthExceeded) {
        errorMessage += ` Value too long for column: ${matchLengthExceeded[1]}`;
      } else if (matchUnique) {
        errorMessage += ` Duplicate value found in column: ${matchUnique[1]}`;
      } else if (matchCheck) {
        // Check violation
        errorMessage = `Check constraint violation occurred in column: ${matchCheck[1]}`;
      } else if (matchNull) {
        // Not null violation
        errorMessage += ` Null value found in not null column: ${matchNull[1]}`;
      } else if (error.code === '23503') {
        // Foreign key violation
        errorMessage += ` Foreign key constraint violation occurred`;
      } else if (error.code === '23504') {
        // Serialization failure
        errorMessage += ` Serialization failure occurred`;
        if (error.detail && typeof error.detail === 'string') {
          errorMessage += ` Additional details: ${error.detail}`;
        }
      } else if (error.message) {
        errorMessage += `${error.message}`;
      } else {
        errorMessage += `${error}`;
      }
    } else if (error.message) {
      errorMessage = `${error.message}`;
      const matchLengthExceeded = error.message.match(
        /value too long for type character varying\((\d+)\)/i,
      );
      if (matchLengthExceeded) {
        errorMessage = `Value too long for a column of length: ${matchLengthExceeded[1]}`;
      }
    } else {
      errorMessage = `${error}`;
    }
    // Demoted to WARN — this is the final processed error message about to
    // be rejected; emitting it as [SUCCESS] was misleading.
    logger.warn(errorMessage);
    reject(errorMessage); // Reject the promise with the error message
  });
}

// Xero documents a small set of ApiException numbers in their schema.
// Map the common ones to a short human sentence so the sync-log UI can
// say "Validation exception" instead of just "ErrorNumber: 10".
// Reference: https://developer.xero.com/documentation/api/accounting/types/
const XERO_ERROR_NUMBER_DESCRIPTIONS: Record<number, string> = {
  10: 'Validation exception (one or more field values were rejected)',
  11: 'Authorization exception (the connected user is not permitted to perform this action)',
  12: 'Not implemented',
  13: 'No data exception',
  14: 'Application exception (unexpected internal Xero error)',
  15: 'Database exception',
  16: 'Security exception',
  17: 'Object not of required type',
  18: 'Duplicate exception (a record with the same key already exists)',
  19: 'Posted invoice exception (the invoice is already authorised/paid and cannot be modified)',
};

export function describeXeroErrorNumber(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return XERO_ERROR_NUMBER_DESCRIPTIONS[Number(n)] ?? null;
}

export interface AxiosErrorContext {
  // Best one-line, human-readable message (the same string handleAxiosError resolves to).
  message: string;
  // HTTP request context (may be null when the SDK strips axios config off the error).
  status: number | string | null;
  method: string | null;
  url: string | null;
  tenantId: string | null;
  // Xero ApiException fields.
  xeroErrorNumber: number | null;
  xeroErrorType: string | null;
  xeroErrorNumberDescription: string | null;
  // ProblemDetails (RFC 7807) shape used by newer Xero endpoints and Forbidden responses.
  problemDetailsTitle: string | null;
  problemDetailsDetail: string | null;
  // Flat list of all validation messages from any recognised collection.
  validationErrors: string[];
  // Capped snippet of the raw response body for last-resort debugging.
  bodySnippet: string | null;
  bodyType: string;
  // True when no recognised shape matched — i.e. we returned the generic fallback string.
  usedGenericFallback: boolean;
}

// Diagnostic helper: pull just enough context out of an axios error to
// pinpoint which Xero endpoint / tenant a failure came from, without
// dumping huge bodies into the log stream.
function summarizeAxiosError(error: any): {
  status: number | string | null;
  method: string | null;
  url: string | null;
  tenantId: string | null;
  bodySnippet: string | null;
  bodyType: string;
} {
  const cfg = error?.config || error?.response?.config || {};
  const headers = cfg?.headers || {};
  const tenantId =
    headers['xero-tenant-id'] ||
    headers['Xero-tenant-id'] ||
    headers['Xero-Tenant-Id'] ||
    null;
  const rawBody = error?.response?.data ?? error?.response?.body;
  let bodyType: string = typeof rawBody;
  let bodySnippet: string | null = null;
  if (rawBody != null) {
    try {
      const asString =
        typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
      bodySnippet = asString.length > 500 ? asString.slice(0, 500) + '…' : asString;
    } catch {
      bodySnippet = '[unstringifiable body]';
    }
  }
  return {
    status: error?.response?.status ?? error?.response?.statusCode ?? null,
    method: cfg?.method ? String(cfg.method).toUpperCase() : null,
    url: cfg?.url || cfg?.baseURL || null,
    tenantId: tenantId ? String(tenantId) : null,
    bodySnippet,
    bodyType,
  };
}

// Pull validation error messages out of every Xero collection shape we've
// seen in the wild. Xero nests ValidationErrors under whichever resource
// the POST/PUT targeted — Invoices for invoice POSTs, BankTransactions
// for spend-money POSTs, etc. The previous handler only knew about
// `Elements[]`, so validation errors on invoice/bill POSTs were silently
// swallowed and surfaced as the generic "An error occurred in Xero".
function extractValidationErrors(body: any): string[] {
  if (!body || typeof body !== 'object') return [];
  const out: string[] = [];
  const collections = [
    'Elements',
    'Invoices',
    'BankTransactions',
    'Payments',
    'Contacts',
    'CreditNotes',
    'ManualJournals',
    'Items',
    'Receipts',
    'Overpayments',
    'Prepayments',
    'BankTransfers',
    'Accounts',
    'TaxRates',
    'TrackingCategories',
    'PurchaseOrders',
    'Quotes',
  ];
  for (const key of collections) {
    const arr = (body as any)[key];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      const ves = item?.ValidationErrors;
      if (Array.isArray(ves)) {
        for (const ve of ves) {
          const m = ve?.Message;
          if (typeof m === 'string' && m.trim()) out.push(m.trim());
        }
      }
    }
  }
  // Some endpoints return a top-level ValidationErrors array.
  if (Array.isArray(body.ValidationErrors)) {
    for (const ve of body.ValidationErrors) {
      const m = ve?.Message;
      if (typeof m === 'string' && m.trim()) out.push(m.trim());
    }
  }
  // De-dup while preserving order, then cap to bound storage/log/UI impact
  // on pathological bodies (some Xero validation responses can be huge).
  const MAX_VALIDATION_ERRORS = 50;
  const MAX_VALIDATION_MESSAGE_CHARS = 500;
  const deduped = Array.from(new Set(out));
  const capped = deduped.slice(0, MAX_VALIDATION_ERRORS).map((m) =>
    m.length > MAX_VALIDATION_MESSAGE_CHARS
      ? m.slice(0, MAX_VALIDATION_MESSAGE_CHARS) + '…'
      : m,
  );
  if (deduped.length > MAX_VALIDATION_ERRORS) {
    capped.push(
      `…and ${deduped.length - MAX_VALIDATION_ERRORS} more validation error(s) (truncated)`,
    );
  }
  return capped;
}

export function extractAxiosErrorContext(axiosError: any): AxiosErrorContext {
  // If it's a JSON-stringified error, try to parse first.
  let error = axiosError;
  if (typeof error === 'string') {
    try {
      error = JSON.parse(error);
    } catch {
      // leave as string
    }
  }

  const ctx = summarizeAxiosError(error);
  const errorBody = error?.response?.data ?? error?.response?.body ?? null;
  const statusCode = ctx.status;

  // Pull Xero ApiException fields wherever they hide.
  const xeroErrorNumber =
    typeof errorBody?.ErrorNumber === 'number' ? errorBody.ErrorNumber : null;
  const xeroErrorType =
    typeof errorBody?.Type === 'string' && errorBody?.Status === undefined
      ? errorBody.Type
      : typeof errorBody?.Type === 'string'
        ? errorBody.Type
        : null;
  const problemDetailsTitle =
    typeof errorBody?.Title === 'string' ? errorBody.Title : null;
  const problemDetailsDetail =
    typeof errorBody?.Detail === 'string' ? errorBody.Detail : null;
  const validationErrors = extractValidationErrors(errorBody);

  // Compose the best human-readable one-liner we can.
  let message: string;
  let usedGenericFallback = false;

  if (error?.response) {
    if (
      statusCode === 401 &&
      problemDetailsDetail === 'AuthenticationUnsuccessful'
    ) {
      message = 'Unauthorized: Refresh token is invalid or expired.';
    } else if (errorBody?.error === 'invalid_grant') {
      message = 'Refresh token invalid or expired. Need to re-authenticate.';
    } else if (validationErrors.length > 0) {
      // Highest-value branch — surface Xero's actual validation feedback.
      const desc = describeXeroErrorNumber(xeroErrorNumber);
      const prefix = desc
        ? `${desc}: `
        : xeroErrorType
          ? `${xeroErrorType}: `
          : '';
      message = `${prefix}${validationErrors.join('; ')}`;
    } else if (problemDetailsTitle && problemDetailsDetail) {
      // ProblemDetails / RFC 7807 shape — e.g. 403 Forbidden / AuthenticationUnsuccessful.
      message = `${problemDetailsTitle} (${statusCode ?? '?'}): ${problemDetailsDetail}`;
    } else if (statusCode === 500 && problemDetailsTitle === 'An error occurred') {
      message = problemDetailsDetail || 'An error occurred in Xero';
      if (!problemDetailsDetail) usedGenericFallback = true;
    } else if (statusCode === 404) {
      message =
        typeof errorBody === 'string'
          ? errorBody
          : problemDetailsDetail || 'Resource not found in Xero';
    } else if (errorBody?.Message) {
      message = errorBody.Message;
    } else if (problemDetailsDetail) {
      message = problemDetailsDetail;
    } else {
      message = 'An error occurred in Xero';
      usedGenericFallback = true;
    }
  } else if (error?.message) {
    message = error.message;
  } else {
    message = String(error);
  }

  return {
    message,
    status: ctx.status,
    method: ctx.method,
    url: ctx.url,
    tenantId: ctx.tenantId,
    xeroErrorNumber,
    xeroErrorType,
    xeroErrorNumberDescription: describeXeroErrorNumber(xeroErrorNumber),
    problemDetailsTitle,
    problemDetailsDetail,
    validationErrors,
    bodySnippet: ctx.bodySnippet,
    bodyType: ctx.bodyType,
    usedGenericFallback,
  };
}

// Compose the richest human-readable one-liner we can from an already
// extracted AxiosErrorContext. When a recognised Xero body shape matched,
// `ctx.message` is already the best one-liner (validation feedback,
// ProblemDetails, etc) so we return it unchanged. When we hit the generic
// fallback (the body couldn't be decoded into a known shape — the case that
// previously surfaced the bare "An error occurred in Xero"), append the
// diagnostic breadcrumbs (status, method, endpoint, tenant, Xero error
// number, body snippet) that today only go to the app logger so the sync
// log row the user reads is actually debuggable.
export function composeXeroErrorMessage(ctx: AxiosErrorContext): string {
  if (!ctx || !ctx.usedGenericFallback) {
    return ctx?.message ?? 'An error occurred in Xero';
  }
  const parts: string[] = [];
  if (ctx.status != null) parts.push(`HTTP ${ctx.status}`);
  if (ctx.url) parts.push(`${ctx.method || 'GET'} ${ctx.url}`);
  if (ctx.tenantId) parts.push(`tenant ${ctx.tenantId}`);
  if (ctx.xeroErrorNumberDescription) {
    parts.push(ctx.xeroErrorNumberDescription);
  } else if (ctx.xeroErrorNumber != null) {
    parts.push(`Xero error ${ctx.xeroErrorNumber}`);
  }
  if (ctx.bodySnippet) parts.push(`body=${ctx.bodySnippet}`);
  return parts.length ? `${ctx.message} (${parts.join(' — ')})` : ctx.message;
}

export async function handleAxiosError(axiosError): Promise<any> {
  return new Promise(async (resolve, reject) => {
    // If it's a string, try parsing it first so we can short-circuit the
    // legacy "string in, string out" behaviour callers may depend on.
    if (typeof axiosError === 'string') {
      try {
        axiosError = JSON.parse(axiosError);
      } catch (parseErr) {
        logger.warn(`Failed to parse axiosError string: ${axiosError}`);
        return reject(axiosError);
      }
    }

    const ctx = extractAxiosErrorContext(axiosError);

    // When we couldn't decode the Xero response body (the case that
    // produces the bare "An error occurred in Xero" message), emit a
    // structured diagnostic so the next occurrence is debuggable
    // without re-deploying. The resolved string is unchanged so any
    // upstream string-matching keeps working.
    if (ctx.usedGenericFallback) {
      logger.warn(
        `Unrecognized Xero error body — status=${ctx.status} method=${ctx.method} url=${ctx.url} tenant=${ctx.tenantId} bodyType=${ctx.bodyType} body=${ctx.bodySnippet}`,
      );
    }

    // Demoted to WARN — this fires on every handled Xero/axios failure;
    // emitting as [SUCCESS] inflated apparent success counts in log scans.
    logger.warn(`Handled Axios Error: ${ctx.message}`);
    resolve(ctx.message);
  });
}
