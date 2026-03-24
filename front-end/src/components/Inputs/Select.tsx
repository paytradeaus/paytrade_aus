import { Fragment } from "react";

// Defined the SelectProps interface with all props needed for the component.
interface SelectProps {
  label: string; // The label text for the input field.
  name: string; // The 'name' attribute for the input element.
  options: Array<any>; // Available dropdown array of objects.
  value: string | number; // Selected dropdown value.
  renderKey: string; // Key to render option text.
  valueKey: string; // Key to get option value.
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; // Handles onChange event.
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void; // Optional function to handle onBlur event.
  placeholder?: string; // Placeholder text for the input field.
  error?: string; // Error message to display if there's an error.
  required?: boolean; // Indicates if the field is required.
  disableAutoComplete?: boolean; // Toggles the autoComplete attribute.
  hint?: string; // Optional hint text to display under the input.
  disabled?: boolean; // Optional boolean to disable the input field.
  showError: boolean;
  returnSelectedObject: boolean; //to return all objects
  secondLabel?: string;
  disableAllOptions?: boolean; // If true, disables all options in the select dropdown.
  onSecondLabelClick?: () => void;
}

// The Select component.
export default function Select({
  label,
  name,
  hint,
  options,
  value,
  renderKey,
  valueKey,
  placeholder = "Select...",
  disabled = false,
  error = "",
  onChange,
  required = false,
  disableAutoComplete = false,
  onBlur,
  showError,
  returnSelectedObject = false,
  secondLabel,
  disableAllOptions = false,
  onSecondLabelClick = () => {},
}: Readonly<SelectProps>) {
  // Function to render available options for the select element.
  function renderAvailableOptions() {
    return options?.map((x: any, index: number) => (
      <option value={x?.[valueKey]} key={index} disabled={disableAllOptions}>
        {x?.[renderKey]}
      </option>
    ));
  }

  function handleChange(selectedValue: any) {
    if (returnSelectedObject) {
      const selectedObj =
        options?.length > 0 &&
        options.find(
          (optionsObj: any) => optionsObj[valueKey] == selectedValue
        );

      onChange(selectedObj ?? selectedValue);
    } else {
      onChange(selectedValue);
    }
  }

  return (
    <Fragment>
      {/* Label for the select field, displays asterisk if the field is required */}
      {label && (
        <label htmlFor={name} className="d_flex_justify_sb">
          <div>
            <small>{label}</small>
            {/* Display label with asterisk if required */}
            {required && <span className="required">*</span>}
          </div>
          {/* {secondLabel && ( */}
          {Boolean(secondLabel && secondLabel.trim()) && (
            <span
              onClick={() => onSecondLabelClick()}
              className="cu-pointer linkStyles"
            >
              {secondLabel}
            </span>
          )}
        </label>
      )}
      {/* Select input field with various properties */}
      <select
        id={name}
        name={name}
        value={value}
        disabled={disabled}
        aria-invalid={showError && "true"}
        onChange={(e: any) => {
          handleChange(e?.target?.value);
        }}
        autoComplete={disableAutoComplete ? "off" : "on"}
        onBlur={onBlur}
      >
        {/* Display a placeholder option when options are available and no value is selected */}
        {((options?.length > 0 && !value) || options?.length === 0) && (
          <option value="" disabled={disableAllOptions || disabled}>
            {placeholder}
          </option>
        )}
        {/* Render available options if there are any */}
        {options?.length > 0 && renderAvailableOptions()}
      </select>
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
