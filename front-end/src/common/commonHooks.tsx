"use client";
import { useCallback, useEffect, useState } from "react";
import { getCookie } from "cookies-next";
import { jwtDecode } from "jwt-decode";
import { debounce } from "lodash";

export const useTokenDetails = () => {
  try {
    const accessTokenId = localStorage.getItem("accessToken");
    // const accessTokenId = "";
    const decodeTokenData: any = accessTokenId
      ? jwtDecode(accessTokenId)
      : null;
    return { accessTokenId, decodeTokenData };
  } catch (error) {
    return {};
  }
  // const accessTokenId = localStorage.getItem("accessToken");
  // // const accessTokenId = "";
  // const decodeTokenData: any = accessTokenId ? jwtDecode(accessTokenId) : null;
  // return { accessTokenId, decodeTokenData };
};

export const useCompanySpecificRoles = () => {
  const { decodeTokenData } = useTokenDetails();
  const [companySpecificRoles, setCompanySpecificRoles] = useState({});

  useEffect(() => {
    let companyId: any;
    if (typeof localStorage !== "undefined") {
      companyId = localStorage.getItem("companyId");
    } else {
      console.log("localStorage is not available in this environment.");
    }
    const roleDetails = decodeTokenData?.companySpecificRoles?.filter(
      (x: { companyId: number }) => String(x.companyId) === String(companyId)
    );
    const companyRoles = roleDetails?.length > 0 ? roleDetails?.[0] : {};
    setCompanySpecificRoles(companyRoles);
  }, [decodeTokenData]);

  return companySpecificRoles;
};

// Custom hook for debouncing
export function useCustomDebounce(value: string, delay: number) {
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

// Export statements...

export const CompanySpecificRoles = useCompanySpecificRoles;

export const useDebouncedFieldCheck = (
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
