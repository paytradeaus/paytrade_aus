import React from "react";
import { Form } from "react-bootstrap";
import { FormCheckProps } from "react-bootstrap";
import styles from "./radio.module.scss";

interface CustomCheckBoxAndRadioProps extends FormCheckProps {
  customStyles?: React.CSSProperties;
  className?: any;
  labeStyles?: any;
  label: string;
  checked: boolean;
}

const Radio: React.FC<CustomCheckBoxAndRadioProps> = (props) => {
  const {
    label,
    checked,
    onChange,
    className,
    customStyles,
    labeStyles,
    type,
    ...rest
  } = props;

  return (
    <Form.Check
      type={type || "radio"}
      id={label}
      label={<span className={`${styles.label} ${labeStyles}`}>{label}</span>}
      checked={checked}
      onChange={onChange}
      className={`${styles.myCheckBox} ${className}`}
      style={customStyles}
      {...rest}
    />
  );
};

export default Radio;
