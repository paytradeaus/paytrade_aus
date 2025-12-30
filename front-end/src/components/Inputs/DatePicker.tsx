import { Fragment, useEffect, useRef, useState } from "react";
import { InputType } from "@/shared/constant/general";
interface DateTimePickerProps {
  label: string; // Label for the input field
  name: string; // Name attribute for the input field
  value: string; // Current value of the input field
  type: "date" | "time" | "month"; // Restrict to valid input types
  hint?: string; // Optional hint text to display below the input
  disabled?: boolean; // Optional flag to disable the input
  error?: string; // Optional error message to display
  onChange: (event: any) => void; // Function to handle changes to the input
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void; // Optional function to handle blur event
  required?: boolean; // Flag to indicate if the field is required
  minDate?: string; // Optional minimum date
  maxDate?: string; // Optional maximum date
  showError?: boolean;
  customizeErrorFont?: any;
}

// DatePicker component definition
export default function DatePicker({
  label,
  name,
  value,
  hint,
  disabled = false, // Default to false if not provided
  error = "", // Default to empty string if not provided
  onChange,
  required = false, // Default to false if not provided
  minDate = "", // Default to empty string if not provided
  maxDate = "", // Default to empty string if not provided
  onBlur,
  type,
  showError,
  customizeErrorFont = "",
}: Readonly<DateTimePickerProps>) {
  // State to hold the effective minimum and maximum dates
  const [existingMinDate, setExistingMinDate] = useState("");

  const [existingMaxDate, setExistingMaxDate] = useState("");

  const [selectedDate, setSelectedDate] = useState("");

  const datePickerRef = useRef<any>(null);

  const [manualDateError, setManualDateError] = useState("");

  // Effect to set the min and max dates based on the current year
  useEffect(() => {
    // Get the current year
    const currentYear = new Date().getFullYear();

    // Calculate the range for the last 50 years and future 20 years
    const minYear = currentYear - 50; // 50 years in the past
    const maxYear = currentYear + 30; // 30 years in the future

    // Set the min and max dates based on the 50-year range
    let initialMinDate = `${minYear}-01-01`;
    let initialMaxDate = `${maxYear}-12-31`;

    if (type === InputType.MONTH_YEAR_PICKER) {
      initialMinDate = `${minYear}-01`;
      initialMaxDate = `${maxYear}-12`;
    }

    // Determine the effective minDate
    const effectiveMinDate = minDate
      ? new Date(minDate) > new Date(initialMinDate)
        ? minDate
        : initialMinDate
      : initialMinDate;

    // Determine the effective maxDate
    const effectiveMaxDate = maxDate
      ? new Date(maxDate) < new Date(initialMaxDate)
        ? maxDate
        : initialMaxDate
      : initialMaxDate;

    // Set the minimum and maximum dates
    setExistingMinDate(effectiveMinDate);
    setExistingMaxDate(effectiveMaxDate);
  }, [minDate, maxDate]);

  useEffect(() => {
    if (value != undefined) setSelectedDate(formatDateToDisplay(value)); // Output: 01/12/2024 (depending on time zone)
  }, [value]);

  function formatDateToISO(displayDate: string) {
    const isMonthPicker = type == InputType.MONTH_YEAR_PICKER;
    if (!displayDate) return "";

    const [day, month, year] = displayDate.split("/");
    const date = isMonthPicker ? `${month}-${day}` : `${year}-${month}-${day}`; // Convert DD/MM/YYYY to YYYY-MM-DD

    return date;
  }

  function formatDateToDisplay(isoDate: string) {
    if (!isoDate || typeof isoDate !== "string") return "";
    const [year, month, day] = isoDate.split("-");
    return type == InputType.MONTH_YEAR_PICKER
      ? `${month}/${year}`
      : `${day}/${month}/${year}`; // Convert YYYY-MM-DD to DD/MM/YYYY
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedISODate = e.target.value; // YYYY-MM-DD

    const formattedDate = formatDateToDisplay(selectedISODate); // Convert to DD/MM/YYYY

    setSelectedDate(formattedDate);
    // ✅ Clear any manual input error if user picks valid date
    setManualDateError("");
    onChange(selectedISODate); // Send YYYY-MM-DD to parent
  }

  function handleOnClick() {
    if (datePickerRef.current && !disabled) {
      try {
        datePickerRef.current.showPicker();
      } catch (err) {
        // Optional: log or silently ignore error
        console.warn("Cannot show picker:", err);
      }
    }
  }

  function handleDateChangeFromTextInput(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    let input = e.target.value.replace(/[^\d]/g, ""); // Only digits

    const isMonthPicker = type === InputType.MONTH_YEAR_PICKER;

    if (isMonthPicker) {
      // Auto format to mm/yyyy
      if (input.length >= 3) {
        input = input.slice(0, 2) + "/" + input.slice(2, 6);
      }

      setSelectedDate(input);
      setManualDateError("");

      if (input === "") {
        onChange("");
        return;
      }

      const [mm, yyyy] = input.split("/");
      if (mm?.length === 2 && yyyy?.length === 4) {
        const month = parseInt(mm);
        const year = parseInt(yyyy);
        if (month >= 1 && month <= 12) {
          const iso = `${yyyy}-${mm.padStart(2, "0")}`;
          const inputDate = new Date(iso + "-01");

          const min = existingMinDate
            ? new Date(existingMinDate + "-01")
            : null;
          const max = existingMaxDate
            ? new Date(existingMaxDate + "-01")
            : null;

          if (min && inputDate < min) {
            setManualDateError(
              `Date cannot be earlier than ${formatDateToDisplay(
                existingMinDate
              )}`
            );
            return;
          }

          if (max && inputDate > max) {
            setManualDateError(
              `Date cannot be later than ${formatDateToDisplay(
                existingMaxDate
              )}`
            );
            return;
          }

          onChange(iso);
        } else {
          setManualDateError("Invalid month");
        }
      } else if (input.length === 7) {
        setManualDateError("Invalid date format");
      }
    } else {
      // Default dd/mm/yyyy logic
      if (input.length >= 3 && input.length <= 4) {
        input = input.slice(0, 2) + "/" + input.slice(2);
      } else if (input.length >= 5) {
        input =
          input.slice(0, 2) + "/" + input.slice(2, 4) + "/" + input.slice(4, 8);
      }

      setSelectedDate(input);
      setManualDateError("");

      if (input === "") {
        onChange("");
        return;
      }

      const parts = input.split("/");
      if (parts.length === 3) {
        const [dd, mm, yyyy] = parts;

        const iso = `${yyyy}-${mm}-${dd}`;
        const dateObj = new Date(iso);

        if (
          dd.length === 2 &&
          mm.length === 2 &&
          yyyy.length === 4 &&
          !isNaN(dateObj.getTime())
        ) {
          const min = existingMinDate ? new Date(existingMinDate) : null;
          const max = existingMaxDate ? new Date(existingMaxDate) : null;

          if (min && dateObj < min) {
            setManualDateError(
              `Date cannot be earlier than ${formatDateToDisplay(
                existingMinDate
              )}`
            );
            return;
          }

          if (max && dateObj > max) {
            setManualDateError(
              `Date cannot be later than ${formatDateToDisplay(
                existingMaxDate
              )}`
            );
            return;
          }

          onChange(iso);
        } else if (input.length === 10) {
          setManualDateError("Invalid date format");
        }
      }
    }
  }

  return (
    <div className="calender-component">
      {label && (
        <label htmlFor={name}>
          <small>{label}</small>
          {/* Display label with asterisk if required */}
          {required && <span className="required">*</span>}
        </label>
      )}

      <span className="input-container-calender">
        <input
          type={InputType.TEXT_FIELD}
          id={name}
          name={name}
          value={selectedDate}
          placeholder={
            type == InputType.MONTH_YEAR_PICKER ? "mm/yyyy" : "dd/mm/yyyy"
          }
          autoComplete="off"
          // onClick={handleOnClick}
          onChange={handleDateChangeFromTextInput}
          onBlur={onBlur}
          disabled={disabled} // Disable input if disabled prop is true
          aria-invalid={showError || manualDateError ? "true" : undefined} // Indicate if there's an error
        />
        {/* {!showError && (
          <i
            className="fa-light fa-calendar calendar-icon"
            onClick={handleOnClick}
          />
        )} */}
        <i
          className={`fa-light fa-calendar  ${
            manualDateError || showError
              ? "whenError-calendar-icon"
              : "calendar-icon"
          }`}
          onClick={handleOnClick}
        />
        {/* Hidden Date Input for Picking Date */}
        <input
          type={type} // Set input type (date, time, month)
          id={name}
          ref={datePickerRef}
          name={name}
          value={selectedDate ? formatDateToISO(selectedDate) : ""}
          min={existingMinDate} // Set min date
          max={existingMaxDate} // Set max date
          onChange={handleDateChange}
          // Handle change event
          onClick={handleOnClick}
          onBlur={onBlur} // Handle blur event if provided
          disabled={disabled} // Disable input if disabled prop is true
          aria-invalid={showError && "true"} // Indicate if there's an error
          style={{
            position: "absolute",
            left: 0,
            opacity: 0,
            pointerEvents: "none",
          }}
        />
      </span>

      {/* Optional hint text under the input field */}
      {hint ? (
        <Fragment>
          {" "}
          <small className="calender-error">{hint}</small>
          {required && <br />}
        </Fragment>
      ) : null}
      {/* Display error message if there is one */}
      {/* {showError ? (
        <small
          className={`invalid calender-error ${
            customizeErrorFont ? customizeErrorFont : ""
          }`}
        >
          <i className="fa-light fa-circle-xmark"></i>
          {error} 
        </small>
      ) : null} */}
      {(manualDateError || (showError && error)) && (
        <small className={`invalid calender-error ${customizeErrorFont || ""}`}>
          <i className="fa-light fa-circle-xmark"></i>
          {manualDateError || error}
        </small>
      )}
    </div>
  );
}
