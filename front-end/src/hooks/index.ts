import { useCallback, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import debounce from "lodash/debounce";

function useTokenDetails() {
  try {
    const accessTokenId = localStorage.getItem("accessToken");

    const decodeTokenData: any = accessTokenId
      ? jwtDecode(accessTokenId)
      : null;
    return { accessTokenId, decodeTokenData };
  } catch {
    return {};
  }
}

// Custom hook for debouncing
function useCustomDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timeout to update the debounced value
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value or delay changes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function useIsClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // Ensures this runs only on the client side
  }, []);

  return { isClient };
}

const useDebouncedFieldCheck = (
  fieldValue: any,
  validateFn: (value: any) => Promise<boolean>, // Custom validation logic
  onSuccess: (res: any) => void,
  onError: (error: string) => void,
  debounceTime: number = 500 // Default debounce time
) => {
  const [isChecking, setIsChecking] = useState(false);

  // Memoizing validateFn, onSuccess, and onError to avoid unnecessary re-creations
  const stableValidateFn = useCallback(validateFn, []);
  const stableOnSuccess = useCallback(onSuccess, []);
  const stableOnError = useCallback(onError, []);

  const debouncedCheck = useCallback(
    debounce(async (value: any) => {
      if (!value || value.length < 1) return; // Early return if the field is empty
      setIsChecking(true);

      try {
        const isValid = await stableValidateFn(value);
        if (isValid) {
          stableOnSuccess(isValid);
        } else {
          stableOnError(`Invalid ${value}`);
        }
      } catch (err) {
        console.error("Error validating field", err);
        stableOnError("Validation failed");
      } finally {
        setIsChecking(false);
      }
    }, debounceTime),
    [debounceTime, stableValidateFn, stableOnError, stableOnSuccess]
  );

  useEffect(() => {
    if (fieldValue) {
      debouncedCheck(fieldValue);
    }
    return () => {
      debouncedCheck.cancel(); // Ensure debounce cancellation on cleanup
    };
  }, [fieldValue, debouncedCheck]);

  return isChecking;
};

export {
  useIsClient,
  useTokenDetails,
  useCustomDebounce,
  useDebouncedFieldCheck,
};
