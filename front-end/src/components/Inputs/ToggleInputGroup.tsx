import { Fragment, useRef } from "react";

// Defined the RadioCheckBoxSwitchProps interface with all props needed for the component.
interface RadioCheckBoxSwitchProps {
  type: string; // Specifies the input type ('radio' or 'checkbox').
  label?: string; // The label text for the checkbox/radio field.
  name: string; // The 'name' attribute for the input element.
  checked?: boolean; // Boolean indicating whether the checkbox/radio is selected.
  required?: boolean; // Boolean to indicate if the field is required.
  selectedValue: string | number | boolean; // Value associated with the checkbox/radio input.
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; // Function to handle change events.
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void; // Optional function to handle blur events.
  role?: string; // Optional role attribute for the switch input element (for accessibility purposes).
  placeholder?: string; // Placeholder text for the field (not commonly used for checkboxes or radios).
  error?: string; // Error message to display if validation fails.
  hint?: string; // Optional hint text displayed below the input.
  disabled?: boolean; // Boolean to disable the checkbox/radio input.
  options: Array<any>;
  showError?: boolean;
  value?: any;
  id?: string;
}

// The ToggleInputGroup component.
export default function ToggleInputGroup({
  name, // The name attribute for the input element.
  // label, // The label text displayed next to the checkbox/radio.
  onChange, // Function to handle checkbox/radio changes.
  onBlur, // Optional function to handle blur events.
  hint, // Optional hint text displayed below the checkbox/radio.
  error, // Error message displayed in case of validation failure.
  value, // The value of the checkbox/radio.
  disabled, // Boolean to disable the checkbox/radio input.
  type, // Defines if it's a 'checkbox' or 'radio' input.
  checked, // The checked state (true for checked, false for unchecked).
  role,
  selectedValue,
  label,
  required,
  options = [],
  showError,
  id,
}: Readonly<RadioCheckBoxSwitchProps>) {
  const radioRef = useRef<any>(null);
  return (
    <Fragment>
      {options?.length > 0 && (
        <fieldset className="input_wrap" disabled={disabled}>
          {label && options?.length > 0 && (
            <label>
              <small>{label}</small>
              {/* Display label with asterisk if required */}
              {required && <span className="required">*</span>}
            </label>
          )}

          {options?.length > 0 &&
            options.map((radioObj: any, index: number) => (
              /* Label for the checkbox or radio input, wrapping the input element */
              <Fragment key={id}>
                {/* The input element (checkbox or radio) with a controlled checked state */}
                <input
                  type={type} // Specifies if the input is 'checkbox' or 'radio'.
                  role={role} // Optional role attribute for accessibility of switch.
                  value={radioObj?.value} // The value assigned to the input element.
                  id={radioObj?.value} // Unique identifier for the input element.
                  name={name} // Name attribute used for form submission.
                  checked={radioObj?.value === selectedValue} // Controlled checked state based on the 'checked' prop.
                  onChange={onChange} // Function to handle change events.
                  onBlur={onBlur} // Optional function to handle blur events.
                  disabled={disabled} // Disable the input if necessary.
                  aria-invalid={showError && "true"} // Accessibility attribute indicating validity.
                  ref={radioRef} // Ref to the first radio input
                />
                <label
                  className={disabled ? "cur_not_allowed" : ""}
                  htmlFor={radioObj?.value}
                  onClick={(e: any) => {
                    if (radioRef?.current) {
                      radioRef.current.click();
                    }
                  }}
                >
                  {/* Display the label text next to the checkbox */}
                  <small>{radioObj?.label ?? ""}</small>
                </label>
              </Fragment>
            ))}
        </fieldset>
      )}
      <Fragment>
        {/* The input element (checkbox or radio) with a controlled checked state */}
        {!options?.length && (
          <input
            type={type} // Specifies if the input is 'checkbox' or 'radio'.
            role={role} // Optional role attribute for accessibility of switch.
            value={value} // The value assigned to the input element.
            id={id || name} // Unique identifier for the input element.
            name={name} // Name attribute used for form submission.
            checked={value} // Controlled checked state based on the 'checked' prop.
            onChange={onChange} // Function to handle change events.
            onBlur={onBlur} // Optional function to handle blur events.
            disabled={disabled} // Disable the input if necessary.
            aria-invalid={showError && "true"} // Accessibility attribute indicating validity.
          />
        )}
        {label && options?.length === 0 && (
          <label htmlFor={name} className={disabled ? "cur_not_allowed" : ""}>
            {/* Display the label text next to the checkbox */}
            <small> {label ?? ""}</small>
          </label>
        )}
      </Fragment>
      {/* Optional hint text displayed under the checkbox input */}
      {hint ? <small>{hint}</small> : null}

      {/* Display an error message if there's a validation error */}
      {showError ? (
        <small className="invalid error_wrap">
          <i className="fa-light fa-circle-xmark"></i>
          {/* Icon for the error message */}
          {error}
        </small>
      ) : null}
    </Fragment>
  );
}
