import React from "react";
import Button from "react-bootstrap/Button";
import { ButtonProps } from "react-bootstrap/Button";
import styles from "./button.module.scss";

interface CustomButtonProps extends ButtonProps {
  customStyle?: React.CSSProperties;
  className?: string;
  download?: any;
  textPlainBtn?: boolean;
}

const FormButton: React.FC<CustomButtonProps> = (props) => {
  const { onClick, className, customStyle, children, textPlainBtn, ...rest } =
    props;

  const baseClass = `${
    textPlainBtn ? styles.btnStylesPlain : styles.btnStyles
  }`;
  return (
    <Button
      onClick={onClick}
      download
      className={`${baseClass} ${className}`}
      style={customStyle}
      {...rest}
    >
      {children}
    </Button>
  );
};

export default FormButton;
