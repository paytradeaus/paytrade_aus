import { Fragment } from "react";

// Defined the ButtonProps interface with all props needed for the component.
interface ButtonProps {
  buttonName: string; // The text or label to display on the button.
  styles?: React.CSSProperties;
  buttonType: string; // The CSS class or styling for the button.
  onClick?: (e?: any) => void; // The function to handle click events.
  actionType?: "button" | "reset" | "submit"; // The type of action the button performs (default is "submit").
  disabled?: boolean; // Optional boolean to disable the button.
  iconClassName?: string; // Optional icon CSS class to be used within the button.
  enableLoader?: boolean; // Optional boolean to enable/disable loading state.
  inputButton?: boolean; // Optional boolean to render an <input> element instead of a <button>.
  error?: string; // Error message to display if there's an error.
  showError?: boolean; // Boolean to indicate if the error message should be displayed.
  suffixIconClassName?: string; // Optional icon CSS class to be used as a suffix icon within the button.
  label?: string;
  required?: boolean;
  buttonRef?: any;
}

// the CustomButton component.
export default function CustomButton({
  actionType = "submit",
  buttonName,
  buttonType = "",
  onClick,
  disabled,
  styles,
  enableLoader,
  iconClassName,
  suffixIconClassName,
  inputButton = false,
  error = "",
  showError = false,
  label,
  required,
  buttonRef = null,
}: Readonly<ButtonProps>) {
  // Disable onClick handler if the loader is enabled
  const handleClick = enableLoader ? undefined : onClick;

  return (
    <Fragment>
      {label && (
        <label htmlFor={label}>
          <small>{label}</small>
          {required && <span className="required">*</span>}
        </label>
      )}
      {/* Conditionally render an <input> element if inputButton is true */}
      {inputButton ? (
        <input
          type={actionType}
          value={buttonName}
          className={buttonType}
          onClick={onClick}
          disabled={disabled}
          ref={buttonRef}
        />
      ) : (
        // Render a <button> element when inputButton is false
        <button
          style={styles}
          type={actionType}
          value={buttonName}
          className={buttonType}
          onClick={handleClick}
          disabled={disabled}
          aria-busy={enableLoader}
          ref={buttonRef}
        >
          {/* Optionally render an icon inside the button if an iconClassName is provided */}
          {iconClassName ? <i className={iconClassName}></i> : ""}

          {/* Display the button name or label */}
          {buttonName}

          {/* Optionally render a suffix icon if suffixIconClassName is provided */}
          {suffixIconClassName ? <i className={suffixIconClassName}></i> : ""}
        </button>
      )}
      {/* Display the error message if showError is true */}
      {showError && error ? (
        <small className="invalid">
          <i className="fa-light fa-circle-xmark"></i>
          {error}
        </small>
      ) : null}
    </Fragment>
  );
}
