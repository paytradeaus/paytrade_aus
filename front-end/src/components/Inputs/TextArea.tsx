import { Fragment, ReactNode } from "react";

interface TextAreaProps {
  label: string; // The label text for the textarea.
  name: string; // The 'name' attribute for the textarea element.
  value: string; // Value for the textarea field.
  placeholder: string; // Placeholder text for the textarea field.
  error: string; // Error message to display if there's an error.
  required: boolean; // Boolean to indicate if the field is required.
  endingData?: ReactNode;
  endingDataStyles?: string;
  rightAlignedText?: { text: string; isVisible: boolean };
  rightAlignedTextStyles?: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => {}; // Function to handle onChange event.
  onBlur?: (e: React.ChangeEvent<HTMLTextAreaElement>) => {}; // Optional function to handle onBlur event.
  hint?: string; // Optional hint text to display under the textarea.
  disabled?: boolean; // Optional boolean to disable the textarea.
  maxLength?: number; // Maximum character length for the textarea.
  showError?: boolean; // Boolean to toggle error display.
  smallTextAreaError?: boolean;
}

export default function TextArea({
  label,
  name,
  value,
  placeholder,
  hint,
  endingData,
  onChange,
  required = false,
  onBlur,
  disabled = false,
  error = "",
  rightAlignedText,
  rightAlignedTextStyles,
  endingDataStyles,
  showError,
  maxLength = 250,
  smallTextAreaError,
}: Readonly<TextAreaProps>) {
  return (
    <Fragment>
      {/* Label for the textarea field */}
      {label && (
        <label htmlFor={name}>
          <small>{label}</small>
          {/* Display label with asterisk if required */}
          {required && <span className="required">*</span>}
        </label>
      )}
      {/* Textarea field with various properties */}

      <textarea
        id={name}
        name={name}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={showError && "true"}
        onChange={onChange}
        onBlur={onBlur}
        // className={"textAreaField"} // Apply the custom class to remove the border
        maxLength={maxLength}
      />
      {endingData && (
        <i
          className={`toggleIcon ${endingDataStyles} ${
            error ? "error-adjust" : ""
          }`}
        >
          {endingData}
        </i>
      )}

      {/* Optional hint text under the textarea field */}
      {hint ? (
        <Fragment>
          <small>{hint}</small> <br />
        </Fragment>
      ) : null}
      {/* Display error message if there is one */}
      {showError ? (
        <small className={`invalid ${smallTextAreaError ? "areaError" : ""}`}>
          <i className="fa-light fa-circle-xmark"></i>
          {error}
        </small>
      ) : null}
    </Fragment>
  );
}
