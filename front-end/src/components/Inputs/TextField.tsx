import { Fragment, ReactNode } from "react";
// Defined the InputProps interface with all props needed for the component.
interface InputProps {
  label?: string; // The label text for the input field.
  name: string; // The 'name' attribute for the input element.
  value: string | number; // value for the input field.
  placeholder?: string; // Placeholder text for the input field.
  error?: string; // Error message to display if there's an error.
  onEndIconClick?: () => void;
  endingDataStyles?: string;
  rightAlignedText?: { text: string; isVisible: boolean };
  required?: boolean; // Boolean to indicate if the field is required.
  endingData?: ReactNode;
  rightAlignedTextStyles?: string;
  disableAutoComplete: boolean; // Boolean to toggle the autoComplete attribute.
  type: string; //to change type of the inputField, by default it's text
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {}; // Function to handle onChange event.
  onBlur?: (e: React.ChangeEvent<HTMLInputElement>) => {}; // Optional function to handle onBlur event.
  hint?: string; // Optional hint text to display under the input.
  disabled?: boolean; // Optional boolean to disable the input field.
  maxLength?: number;
  showError?: boolean;
  customizeErrorFont?: any;
}

export default function TextField({
  label,
  name,
  value,
  type,
  placeholder,
  hint,
  endingData,
  onEndIconClick,
  endingDataStyles,
  disabled = false,
  error = "",
  rightAlignedTextStyles,
  rightAlignedText,
  onChange,
  required = false,
  disableAutoComplete = false,
  onBlur,
  showError,
  maxLength = 250,
  customizeErrorFont = "",
}: Readonly<InputProps>) {
  // Function to remove emojis
  function removeEmojis(value: string) {
    return value.replace(
      /[\uD800-\uDBFF][\uDC00-\uDFFF]/g,
      "" // Removes emojis
    );
  }

  // Prevent pasting emojis
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pastedText = e?.clipboardData.getData("text");
    if (pastedText !== removeEmojis(pastedText)) {
      e?.preventDefault();
    }
  }

  return (
    <Fragment>
      {/* Label for the input field, displays asterisk if the field is required */}
      {label && (
        <label htmlFor={name}>
          <small>{label}</small>
          {required && <span className="required">*</span>}
        </label>
      )}
      {/* Input field with various properties, like disabled, onChange, autoComplete */}

      <input
        type={type}
        id={name}
        name={name}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={showError && "true"}
        onChange={onChange}
        onPaste={handlePaste}
        autoComplete={disableAutoComplete ? "off" : "on"}
        onBlur={onBlur}
        maxLength={maxLength}
      />
      {endingData && (
        <i
          className={`toggleEye ${endingDataStyles} ${
            error ? "error-adjust" : ""
          }`}
          onClick={onEndIconClick}
        >
          {endingData}
        </i>
      )}

      {/* Optional hint text under the input field */}
      {hint ? (
        <Fragment>
          <small>{hint}</small> {required && <br />}
        </Fragment>
      ) : null}
      {/* Display error message if there is one */}
      {showError ? (
        <small
          className={`invalid ${customizeErrorFont ? customizeErrorFont : ""}`}
        >
          <i className="fa-light fa-circle-xmark"></i>
          {/* Icon for the error message */}
          {error}
        </small>
      ) : null}

      {rightAlignedText?.isVisible && (
        <div className={`position-absolute ${rightAlignedTextStyles}`}>
          {rightAlignedText.text}
        </div>
      )}
    </Fragment>
  );
}
