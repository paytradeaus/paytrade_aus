import React from "react";
import { Form } from "react-bootstrap";
import { FormCheckProps } from "react-bootstrap";
import styles from "./checkBox.module.scss";

interface CustomCheckBoxAndRadioProps extends FormCheckProps {
  customStyles?: React.CSSProperties;
  className?: string;
  label: string;
  checked: boolean;
}

const CheckBox: React.FC<CustomCheckBoxAndRadioProps> = (props) => {
  const { label, checked, onChange, className, customStyles, type, ...rest } =
    props;

  return (
    <Form.Check
      type={type || "checkbox"}
      label={<span className={styles.label}>{label}</span>}
      checked={checked}
      onChange={onChange}
      className={`${styles.myCheckBox} ${className}`}
      style={customStyles}
      {...rest}
    />
  );
};

export default CheckBox;
