import React, { useState, useEffect } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

// Permissive phone check: accepts any string that looks plausibly like a
// phone number (optional leading +, at least 6 digits, may contain spaces,
// dashes, parentheses). Intentionally looser than libphonenumber-js's
// `isValidPhoneNumber` so we accept free-form numbers that Xero (and many
// real-world contacts) carry — e.g. "+1 800 314 659" — without blocking
// save. Backend Xero sync passes phone strings through verbatim on both
// import and export, so anything we accept here round-trips cleanly.
const isAcceptablePhoneNumber = (value: string | undefined | null): boolean => {
  if (!value) return false;
  const s = String(value).trim();
  if (!/^[+\d][\d\s()\-]*$/.test(s)) return false;
  return (s.match(/\d/g) || []).length >= 6;
};
// import styles from "./phoneNumberInput.module.scss";
import { useFormik } from "formik";

interface PhoneInputFieldProps {
  id: string;
  name: string;
  value?: string;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onChange?: (value: string) => void;
  onPhoneNumberValidChange?: (isValid: boolean) => void;
  error?: boolean;
  showErrorIcon?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}

const PhoneInputField: React.FC<PhoneInputFieldProps> = ({
  id,
  name,
  value,
  onChange,
  onPhoneNumberValidChange,
  onBlur,
  error,
  showErrorIcon = false,
  disabled = false,
  readOnly = false,
}) => {
  const formik = useFormik({
    initialValues: {
      [name]: value || "",
    },
    validate: (values) => {
      const errors: { [key: string]: string } = {};
      const phoneValue = values[name] ?? "";
      if (!isAcceptablePhoneNumber(phoneValue)) {
        errors[name] = "Invalid phone number";
      }
      return errors;
    },
    onSubmit: (values) => {
      // Handle submission logic if needed
    },
  });

  const [dirty, setDirty] = useState<boolean>(false);
  const [isValid, setIsValid] = useState<boolean>(true);
  const [country, setSelectedCountry] = useState<any>("AU");

  useEffect(() => {
    formik.setFieldValue(name, value);
  }, [value]);

  useEffect(() => {
    if (formik.touched[name]) {
      setDirty(true);
    }
  }, [formik.touched, name]);

  const onPhoneBlur = (e: any) => {
    formik.handleBlur(e);
    onBlur && onBlur(e);
  };

  const phoneChange = (data: string | undefined) => {
    const phoneNumberString = data ? String(data).trim() : "";
    formik.setFieldValue(name, phoneNumberString);
    onChange?.(phoneNumberString);
    const isValidPhone = isAcceptablePhoneNumber(phoneNumberString);
    setIsValid(isValidPhone);
    onPhoneNumberValidChange?.(isValidPhone);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === " ") {
      e.preventDefault();
    }
  };

  return (
    <div>
      <PhoneInput
        className={
          error || (!isValid && value) ? "PhoneInputRoot" : "PhoneInputRoot"
        }
        id={id}
        defaultCountry={
          (!value || String(value)?.includes("+61")) && !country
            ? "AU"
            : country
        }
        onCountryChange={(cCode) => {
          if (value || country === "AU") {
            setSelectedCountry(cCode);
          } else {
            setSelectedCountry("AU");
          }
        }}
        international
        withCountryCallingCode
        type="text"
        name={name}
        value={value}
        onBlur={onPhoneBlur}
        onChange={phoneChange}
        onKeyDown={handleKeyDown}
        limitMaxLength={true}
        disabled={disabled}
        readOnly={readOnly}
      />
    </div>
  );
};

export default PhoneInputField;
