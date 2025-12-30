export async function handleError(error): Promise<string> {
  return new Promise(async (resolve, reject) => {
    var errorMessage = '';
    console.log({ error });
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
    console.log(errorMessage);
    reject(errorMessage); // Reject the promise with the error message
  });
}

export async function handleAxiosError(axiosError): Promise<any> {
  return new Promise(async (resolve, reject) => {
    // console.log({ axiosError });
    let errorMessage = 'An unexpected error occurred';

    // If it's a string, try parsing it
    if (typeof axiosError === 'string') {
      try {
        axiosError = JSON.parse(axiosError);
      } catch (parseErr) {
        console.log('Failed to parse axiosError string:', axiosError);
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
      }
    } else if (error?.message) {
      errorMessage = error?.message;
    } else {
      errorMessage = String(error);
    }

    console.log('Handled Axios Error:', errorMessage);
    resolve(errorMessage);
  });
}
