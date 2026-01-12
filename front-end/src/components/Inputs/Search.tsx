import { ChangeEvent, Fragment, useEffect, useState } from "react";

interface SearchProps {
  value?: string; // ✅ external controlled value (optional)
  onChange: (value: string) => void; // Function to handle changes in the search term
  label?: string; // Optional label for the search field
  placeholder?: string; // Placeholder text when the input is empty (defaults to "Search")
  hint?: string; // Optional hint text displayed below the input field
  disabled?: boolean; // Whether the search field is disabled (defaults to false)
  disableAutoComplete?: boolean; // Whether to disable browser autocompletion (defaults to false)
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void; // Function to handle blur event
  debounceDelay?: number; // Delay (in milliseconds) for debouncing onChange calls (defaults to 500)
  optionalClass?: string;
  clearSearch?: boolean;
  showSearchButton?: boolean;
  preventClick?: boolean;
}

/**
 * Search component renders a customizable search input field.
 *
 * @param  props - Properties for the Search component.
 * @returns - The rendered search input field.
 */
export default function Search({
  value = "",
  label,
  placeholder,
  hint,
  disabled = false,
  onChange,
  disableAutoComplete = false,
  onBlur,
  debounceDelay = 500, // Adjust debounce delay as needed
  optionalClass,
  clearSearch = false,
  showSearchButton = false,
  preventClick = false,
}: Readonly<SearchProps>) {
  // Internal state to manage the search term before debounced onChange call
  const [internalValue, setInternalValue] = useState("");

  // ✅ Keep internal value in sync with external updates
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Debounce onChange call using useEffect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onChange(internalValue);
    }, debounceDelay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [internalValue, debounceDelay]);

  useEffect(() => {
    if (clearSearch) {
      setInternalValue("");
    }
  }, [clearSearch]);

  // Function to handle changes in the input field
  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    setInternalValue(event.target.value);
  }

  // Render the search input field and label
  return (
    <Fragment>
      {label && (
        <label htmlFor={label}>
          <small>{label}</small>
        </label>
      )}

      <input
        type="search"
        name={label ?? ""}
        value={internalValue}
        className={optionalClass ?? ""}
        placeholder={placeholder ?? "Search"}
        disabled={disabled}
        onChange={handleInputChange}
        autoComplete={disableAutoComplete ? "off" : "on"}
        onBlur={onBlur}
      />
      {/* Optional hint text under the input field */}
      {hint ? (
        <Fragment>
          <small>{hint}</small> <br />
        </Fragment>
      ) : null}
      {showSearchButton && (
        <input
          type="submit"
          value="Search"
          style={{ pointerEvents: preventClick ? "none" : "auto" }}
          onClick={(event) => {
            event.preventDefault();
            onChange(internalValue);
          }}
        />
      )}
    </Fragment>
  );
}
