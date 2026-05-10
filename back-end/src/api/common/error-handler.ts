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
    logger.log(`error: ${safeStringify(error)}`);
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
    logger.log(errorMessage);
    reject(errorMessage); // Reject the promise with the error message
  });
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

export async function handleAxiosError(axiosError): Promise<any> {
  return new Promise(async (resolve, reject) => {
    // console.log({ axiosError });
    let errorMessage = 'An unexpected error occurred';
    let usedGenericFallback = false;

    // If it's a string, try parsing it
    if (typeof axiosError === 'string') {
      try {
        axiosError = JSON.parse(axiosError);
      } catch (parseErr) {
        // Tag as WARN — `logger.log` writes [SUCCESS] which was misleading.
        logger.warn(`Failed to parse axiosError string: ${axiosError}`);
        return reject(axiosError); // return the original string
      }
    }

    const error = axiosError;
    if (error?.response) {
      const statusCode = error.response?.status || error.response?.statusCode;
      const errorBody = error.response?.data || error.response?.body;
      if (
        statusCode === 401 &&
        errorBody?.Detail === 'AuthenticationUnsuccessful'
      ) {
        errorMessage = 'Unauthorized: Refresh token is invalid or expired.';
      } else if (errorBody?.error === 'invalid_grant') {
        errorMessage =
          'Refresh token invalid or expired. Need to re-authenticate.';
      } else if (
        statusCode === 500 &&
        errorBody?.Title === 'An error occurred'
      ) {
        errorMessage = errorBody?.Detail;
      } else if (statusCode === 404) {
        errorMessage = `${typeof errorBody === 'string' ? errorBody : 'Resource not found in Xero'}`;
      } else if (
        errorBody?.Elements &&
        Array.isArray(errorBody?.Elements) &&
        errorBody.Elements[0]?.ValidationErrors
      ) {
        // Extract all validation errors
        const validationErrors = errorBody.Elements[0]?.ValidationErrors;
        errorMessage = validationErrors.map((err) => err.Message).join(', ');
      } else if (errorBody?.Message) {
        errorMessage = errorBody?.Message;
      } else {
        errorMessage = errorBody?.Detail || 'An error occurred in Xero';
        usedGenericFallback = true;
      }
    } else if (error?.message) {
      errorMessage = error?.message;
    } else {
      errorMessage = String(error);
    }

    // When we couldn't decode the Xero response body (the case that
    // produces the bare "An error occurred in Xero" message), emit a
    // structured diagnostic so the next occurrence is debuggable
    // without re-deploying. Resolved errorMessage is unchanged so any
    // upstream string matching keeps working.
    if (usedGenericFallback) {
      try {
        const ctx = summarizeAxiosError(error);
        logger.warn(
          `Unrecognized Xero error body — status=${ctx.status} method=${ctx.method} url=${ctx.url} tenant=${ctx.tenantId} bodyType=${ctx.bodyType} body=${ctx.bodySnippet}`,
        );
      } catch (diagErr) {
        logger.warn(
          `Unrecognized Xero error body — diagnostic capture failed: ${diagErr?.message || diagErr}`,
        );
      }
    }

    logger.log(`Handled Axios Error: ${errorMessage}`);
    resolve(errorMessage);
  });
}
