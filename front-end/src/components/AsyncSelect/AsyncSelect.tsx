import React, { FC, useMemo, useState } from "react";
import { Form, Alert } from "react-bootstrap";
import styles from "./AsyncSelect.module.scss";
import { ExclamationTriangleFill } from "react-bootstrap-icons";
import AsyncSelect from "react-select/async";

interface SearchableSelectProps {
  options: any;
  selectedOption: any;
  label?: string;
  onChange: any;
  disabled?: boolean;
  placeholder?: string;
  isRequired?: boolean;
  errorMessage?: string;
  controlStyles?: any;
  isMulti?: boolean;
}

const AsyncSearchSelect: FC<SearchableSelectProps> = ({
  options,
  selectedOption,
  label,
  onChange,
  disabled = false,
  placeholder,
  isRequired = false,
  errorMessage = "This field is required.",
  controlStyles,
  isMulti,

  ...rest
}) => {
  const customStyles = useMemo(
    () => ({
      option: (provided: any) => ({
        ...provided,
        padding: 2,
        ...(controlStyles?.option && controlStyles?.option(provided)),
      }),
      control: (provided: any) => ({
        ...provided,
        boxShadow: "none", // Preserving inline style
        ...(errorMessage &&
          isRequired && {
            border: "1px solid #f08e8b ",
            backgroundColor: "#fde5e3",
          }),
        ...(controlStyles?.control && controlStyles?.control(provided)),
      }),
      menu: (provided: any) => ({
        ...provided,
        margin: "0px",
        borderRadius: "0px",
        zIndex: "2",
        padding: 0,
        ...(controlStyles?.menu && controlStyles?.menu(provided)),
      }),
      menuList: (provided: any) => ({
        ...provided,
        paddingTop: "0px",
        paddingBottom: "0px",
        ...(controlStyles?.menuList && controlStyles?.menuList(provided)),
      }),
      valueContainer: (provided: any) => ({
        ...provided,
        ...(controlStyles?.valueContainer &&
          controlStyles?.valueContainer(provided)),
      }),

      // ...controlStyles,
    }),
    [controlStyles]
  );

  const showError = isRequired && errorMessage;
  return (
    <div className={styles.mainConatianer}>
      {label && <Form.Label className={styles.labelStyle}>{label}</Form.Label>}
      <AsyncSelect
        cacheOptions
        loadOptions={options} // Replace with your actual async options fetching logic
        defaultOptions
        value={selectedOption}
        onChange={onChange}
        placeholder={placeholder}
        styles={customStyles}
        {...rest}
      />
      {showError && (
        <div className={styles.errorContainer}>
          <ExclamationTriangleFill className={styles.warningIconStyle} />
          <span className={styles.errorTextStyles}>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default AsyncSearchSelect;
