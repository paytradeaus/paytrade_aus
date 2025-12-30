import React, { ReactNode } from "react";
import FormControl from "react-bootstrap/FormControl";
import { FormControlProps } from "react-bootstrap/FormControl";
import styles from "./textField.module.scss";
import { ExclamationTriangleFill, CurrencyDollar } from "react-bootstrap-icons";
import { InputGroup } from "react-bootstrap";

interface CustomInputProps extends FormControlProps {
  customStyles?: React.CSSProperties;
  classNames?: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
  errorText?: string | any;
  labelText?: string;
  endingData?: ReactNode;
  startingData?: ReactNode;
  endingDataStyles?: string;
  startingDataStyles?: string;
  maxLength?: Number;
  onEndIconClick?: () => void;
  onBodyClick?: () => void;
  rows?: Number;
  autoComplete?: string;
  displayStartAdornment?: boolean;
  startAdornmentIcon?: string;
  rightAlignedText?: { text: string; isVisible: boolean };
  rightAlignedTextStyles?: string;
  labelHint?: string;
  min?: number;
}

const TextField: React.FC<CustomInputProps> = (props) => {
  const {
    labelText,
    labelHint,
    errorText,
    isInvalid,
    classNames,
    endingData,
    startingData,
    endingDataStyles,
    startingDataStyles,
    maxLength,
    onBodyClick,
    onEndIconClick,
    rows,
    displayStartAdornment = false,
    startAdornmentIcon = <CurrencyDollar />,
    rightAlignedText,
    rightAlignedTextStyles,
    ...rest
  } = props;
  return (
    <div>
      {labelText && (
        <label className={styles.labelTextStyle}>
          {labelText}{" "}
          {labelHint && <span className={styles.labelHint}>{labelHint}</span>}
        </label>
      )}

      <div
        className={`input-group ${styles.groupContainer}`}
        onClick={onBodyClick}
      >
        {startingData && (
          <i className={`position-absolute ${startingDataStyles}`}>
            {startingData}
          </i>
        )}
        {displayStartAdornment && (
          <InputGroup.Text className={styles.startAdornment}>
            {startAdornmentIcon}
          </InputGroup.Text>
        )}
        <FormControl
          maxLength={maxLength}
          autoComplete="off"
          className={`posiition-relative ${styles.myFormStyle} ${
            isInvalid && styles.errorBorder
          } ${classNames}`}
          {...rest}
        />
        {endingData && (
          <i
            className={`position-absolute ${endingDataStyles}`}
            onClick={onEndIconClick}
          >
            {endingData}
          </i>
        )}
        {rightAlignedText?.isVisible && (
          <div className={`position-absolute ${rightAlignedTextStyles}`}>
            {rightAlignedText.text}
          </div>
        )}
      </div>
      {errorText && isInvalid && (
        <div className={styles.errorContainer}>
          <ExclamationTriangleFill className={styles.warningIconStyle} />
          <span className={styles.errorTextStyles}>{errorText}</span>
        </div>
      )}
    </div>
  );
};
export default TextField;
