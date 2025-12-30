import React, { Fragment } from "react";

// types for the options and the props of the MultiSelectDropdown component
interface Option {
  value: string | number;
  label: string;
}

// the props interface for the MultiSelectDropdown component.
interface MultiSelectDropdownProps {
  options: Option[]; // The array of available options for the dropdown.
  selectedOptions: Array<string | number>; // The currently selected option values.
  onChange: (selected: Array<string | number>) => void; // A function that triggers when the selected options change.
  placeholder?: string; // Placeholder text when no options are selected.
  required?: boolean; // Whether the field is required or not.
  name: string; // The name attribute for the input field.
  label: string; // The label text for the dropdown.
  hint?: string; // Optional hint text to guide the user.
  error?: string; // Error message if there's a validation issue.
  disabled?: boolean; // Disables the dropdown if set to true.
  renderKey: string; // Key to display for each option (e.g., 'label').
  valueKey: string | number; // The key representing the option value.
  showError: boolean;
}

function MultiSelectDropdown({
  options, // The list of all possible options.
  selectedOptions = [], // The currently selected options, default is an empty array.
  onChange, // Function to handle change in selected options.
  placeholder = "Select", // Default placeholder text.
  required, // Whether the field is required or not.
  name, // Name of the input field.
  label, // Label text displayed above the dropdown.
  hint = "", // Optional hint text (default empty string).
  error = "", // Error message, default is an empty string.
  disabled = false, // Boolean to disable the dropdown, default is false.
  renderKey, // The key used to render the display label.
  valueKey, // The key representing the value of the option.
  showError,
}: Readonly<MultiSelectDropdownProps>) {
  // Handle the selection/deselection of checkboxes when a user interacts with the dropdown.
  function handleChange(value: string) {
    onChange(
      selectedOptions.includes(value)
        ? selectedOptions.filter((option: any) => option !== value) // Remove if already selected.
        : [...selectedOptions, value] // Add if not selected.
    );
  }

  // Generate the display value for the dropdown summary, showing selected options as a comma-separated list.
  function displayValue() {
    return selectedOptions.length
      ? options
          .filter((option: any) => selectedOptions.includes(option?.[valueKey])) // Filter selected options.
          .map((option: any) => option?.[renderKey]) // Map selected options to their labels.
          .join(", ") // Join labels with a comma.
      : placeholder; // If no options are selected, display the placeholder.
  }

  return (
    <Fragment>
      {/* Label for the dropdown */}

      {label && (
        <label htmlFor={name}>
          <small>{label}</small>
          {/* Display label with asterisk if required */}
          {required && <span className="required">*</span>}
        </label>
      )}
      {/* Dropdown structure */}
      <details className="dropdown pt_filtercheckboxes">
        {/* Dropdown summary showing the selected options or placeholder */}
        <summary aria-invalid={showError && "true"}>{displayValue()}</summary>
        {/* List of checkboxes for each option */}
        <ul aria-disabled={disabled ? "true" : "false"}>
          {options?.length > 0 &&
            options.map((option: any) => (
              <li key={option?.[valueKey]}>
                <label aria-disabled={disabled ? "true" : "false"}>
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(option?.[valueKey])} // Mark checkbox as checked if selected.
                    onChange={() => handleChange(option?.[valueKey])} // Call handleChange when an option is clicked.
                    name={option?.[valueKey]}
                  />
                  {/* Display the label from the `renderKey` */}
                  {option?.[renderKey]}{" "}
                </label>
              </li>
            ))}
        </ul>
      </details>
      {/* Optional hint text displayed under the select field */}
      {hint && (
        <Fragment>
          <small>{hint}</small> <br />
        </Fragment>
      )}
      {/* Display an error message if there is one */}
      {showError && (
        <small className="invalid error_wrap">
          <i className="fa-light fa-circle-xmark"></i>
          {/* Icon for the error message */}
          {error}
        </small>
      )}
    </Fragment>
  );
}

export default MultiSelectDropdown;
